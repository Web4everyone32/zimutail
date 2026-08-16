from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="CUSTOMER")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    body_profiles: Mapped[list["BodyProfile"]] = relationship(back_populates="user")


class BodyProfile(Base):
    __tablename__ = "body_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    chest: Mapped[float] = mapped_column(Float)
    waist: Mapped[float] = mapped_column(Float)
    hip: Mapped[float] = mapped_column(Float)
    shoulder: Mapped[float] = mapped_column(Float)
    sleeve: Mapped[float] = mapped_column(Float)
    fit_preference: Mapped[str] = mapped_column(String(24), default="regular")
    user: Mapped[User] = relationship(back_populates="body_profiles")
