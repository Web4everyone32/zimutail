from ..schemas.fit import BodyMeasurements, FitRecommendation, GarmentVariant

# Temporary seed data. This service boundary will be replaced by a repository
# backed by PostgreSQL without changing the public API contract.
VARIANTS = [
    GarmentVariant(id=1, name="Everyday Oxford", sku="OX-BLU-M", size="M", colour="Harbour blue", stock=7, chest=108, waist=104, hip=106, shoulder=45, sleeve=63),
    GarmentVariant(id=2, name="Everyday Oxford", sku="OX-BLU-L", size="L", colour="Harbour blue", stock=0, chest=114, waist=110, hip=112, shoulder=47, sleeve=64),
]


def list_available_variants() -> list[GarmentVariant]:
    return [variant for variant in VARIANTS if variant.stock > 0]


def recommend_variants(profile: BodyMeasurements) -> list[FitRecommendation]:
    results: list[FitRecommendation] = []
    for garment in list_available_variants():
        ease = garment.chest - profile.chest
        label = "Best fit" if 8 <= ease <= 13 else "Close match" if 5 <= ease <= 16 else "Not recommended"
        results.append(FitRecommendation(variant=garment, result=label, chest_ease_cm=ease, rule_version="shirt-regular-v1"))
    return sorted(results, key=lambda result: abs(result.chest_ease_cm - 10))
