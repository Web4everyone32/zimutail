from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..models.catalogue import InventoryBalance, Product, ProductVariant
from ..schemas.fit import BodyMeasurements, FitRecommendation, GarmentVariant, InventoryAdjustment


class InventoryConflictError(Exception):
    pass


@dataclass(frozen=True)
class EaseTarget:
    chest_min: float
    chest_max: float
    waist_min: float
    waist_max: float
    chest_ideal: float
    waist_ideal: float


EASE_TARGETS = {
    "slim": EaseTarget(5, 10, 6, 15, 7, 10),
    "regular": EaseTarget(8, 13, 10, 23, 10, 16),
    "relaxed": EaseTarget(13, 20, 16, 30, 16, 23),
}

SEED_VARIANTS = [
    {"name": "Everyday Oxford", "category": "shirt", "sku": "OX-BLU-M", "size": "M", "colour": "Harbour blue", "stock": 7, "chest": 108, "waist": 104, "hip": 106, "shoulder": 45, "sleeve": 63},
    {"name": "Everyday Oxford", "category": "shirt", "sku": "OX-BLU-L", "size": "L", "colour": "Harbour blue", "stock": 0, "chest": 114, "waist": 110, "hip": 112, "shoulder": 47, "sleeve": 64},
    {"name": "Soft Twill Shirt", "category": "shirt", "sku": "TW-SND-M", "size": "M", "colour": "Warm sand", "stock": 3, "chest": 111, "waist": 107, "hip": 110, "shoulder": 46, "sleeve": 62},
]


def seed_catalogue(session: Session) -> None:
    if session.scalar(select(Product.id).limit(1)) is not None:
        return

    products: dict[tuple[str, str], Product] = {}
    for seed in SEED_VARIANTS:
        product_key = (seed["name"], seed["category"])
        product = products.get(product_key)
        if product is None:
            product = Product(name=seed["name"], category=seed["category"], active=True)
            products[product_key] = product
            session.add(product)

        variant = ProductVariant(
            sku=seed["sku"],
            size=seed["size"],
            colour=seed["colour"],
            chest=seed["chest"],
            waist=seed["waist"],
            hip=seed["hip"],
            shoulder=seed["shoulder"],
            sleeve=seed["sleeve"],
            active=True,
        )
        variant.inventory = InventoryBalance(on_hand=seed["stock"], reserved=0, version=1)
        product.variants.append(variant)

    session.commit()


def _variant_query():
    return (
        select(ProductVariant)
        .join(ProductVariant.product)
        .options(joinedload(ProductVariant.product), joinedload(ProductVariant.inventory))
        .where(Product.active.is_(True), ProductVariant.active.is_(True))
        .order_by(Product.name, ProductVariant.size)
    )


def _to_schema(variant: ProductVariant) -> GarmentVariant:
    inventory = variant.inventory
    available = inventory.available_to_sell if inventory else 0
    return GarmentVariant(
        id=variant.id,
        name=variant.product.name,
        sku=variant.sku,
        size=variant.size,
        colour=variant.colour,
        stock=available,
        reserved=inventory.reserved if inventory else 0,
        version=inventory.version if inventory else 1,
        chest=variant.chest,
        waist=variant.waist,
        hip=variant.hip,
        shoulder=variant.shoulder,
        sleeve=variant.sleeve,
    )


def list_variants(session: Session, *, available_only: bool = False) -> list[GarmentVariant]:
    variants = [_to_schema(variant) for variant in session.scalars(_variant_query()).unique().all()]
    return [variant for variant in variants if variant.stock > 0] if available_only else variants


def _distance_to_range(value: float, minimum: float, maximum: float) -> float:
    if value < minimum:
        return minimum - value
    if value > maximum:
        return value - maximum
    return 0


def _score_variant(profile: BodyMeasurements, garment: GarmentVariant) -> FitRecommendation:
    target = EASE_TARGETS[profile.fit_preference]
    chest_ease = garment.chest - profile.chest
    waist_ease = garment.waist - profile.waist
    outside_distance = _distance_to_range(chest_ease, target.chest_min, target.chest_max)
    outside_distance += _distance_to_range(waist_ease, target.waist_min, target.waist_max) * 0.45
    ideal_distance = abs(chest_ease - target.chest_ideal) + abs(waist_ease - target.waist_ideal) * 0.25

    if outside_distance == 0:
        result = "Best fit"
        score = max(88, round(97 - ideal_distance * 1.5))
        reason = f"{chest_ease:g} cm chest ease and {waist_ease:g} cm waist ease match a {profile.fit_preference} fit."
    elif outside_distance <= 4:
        result = "Close match"
        score = max(70, round(86 - outside_distance * 3 - ideal_distance))
        reason = f"{chest_ease:g} cm chest ease is close to the {profile.fit_preference} target; the feel may be slightly tighter or looser."
    else:
        result = "Not recommended"
        score = max(40, round(68 - outside_distance * 3))
        reason = f"The garment ease falls outside the preferred {profile.fit_preference} range."

    return FitRecommendation(
        variant=garment,
        result=result,
        chest_ease_cm=chest_ease,
        waist_ease_cm=waist_ease,
        score=score,
        reason=reason,
        rule_version=f"shirt-{profile.fit_preference}-v2",
    )


def recommend_variants(session: Session, profile: BodyMeasurements) -> list[FitRecommendation]:
    results = [_score_variant(profile, garment) for garment in list_variants(session, available_only=True)]
    return sorted(results, key=lambda result: (-result.score, result.variant.name, result.variant.size))


def adjust_inventory(session: Session, variant_id: int, adjustment: InventoryAdjustment) -> GarmentVariant:
    inventory = session.scalar(
        select(InventoryBalance)
        .where(InventoryBalance.variant_id == variant_id)
        .with_for_update()
    )
    if inventory is None:
        raise LookupError("Variant inventory was not found")
    if adjustment.expected_version is not None and inventory.version != adjustment.expected_version:
        raise InventoryConflictError("Inventory changed since it was loaded")

    inventory.on_hand = max(inventory.reserved, inventory.on_hand + adjustment.delta)
    inventory.version += 1
    session.commit()

    variant = session.scalar(_variant_query().where(ProductVariant.id == variant_id))
    if variant is None:
        raise LookupError("Variant was not found")
    return _to_schema(variant)
