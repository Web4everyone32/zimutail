from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[str] = mapped_column(String(60), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    variants: Mapped[list["ProductVariant"]] = relationship(back_populates="product")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    sku: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    size: Mapped[str] = mapped_column(String(30))
    colour: Mapped[str] = mapped_column(String(80))
    chest: Mapped[float] = mapped_column(Float)
    waist: Mapped[float] = mapped_column(Float)
    hip: Mapped[float] = mapped_column(Float)
    shoulder: Mapped[float] = mapped_column(Float)
    sleeve: Mapped[float] = mapped_column(Float)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    product: Mapped[Product] = relationship(back_populates="variants")
    inventory: Mapped["InventoryBalance"] = relationship(back_populates="variant", uselist=False)


class InventoryBalance(Base):
    __tablename__ = "inventory_balances"

    variant_id: Mapped[int] = mapped_column(ForeignKey("product_variants.id", ondelete="CASCADE"), primary_key=True)
    on_hand: Mapped[int] = mapped_column(Integer, default=0)
    reserved: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    variant: Mapped[ProductVariant] = relationship(back_populates="inventory")

    @property
    def available_to_sell(self) -> int:
        return max(0, self.on_hand - self.reserved)
