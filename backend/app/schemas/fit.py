from typing import Literal

from pydantic import BaseModel, Field


class BodyMeasurements(BaseModel):
    chest: float = Field(gt=0)
    waist: float = Field(gt=0)
    hip: float = Field(gt=0)
    shoulder: float = Field(gt=0)
    sleeve: float = Field(gt=0)
    fit_preference: Literal["slim", "regular", "relaxed"] = "regular"


class GarmentVariant(BodyMeasurements):
    id: int
    name: str
    sku: str
    size: str
    colour: str
    stock: int = Field(ge=0)
    reserved: int = Field(default=0, ge=0)
    version: int = Field(default=1, ge=1)


class FitRecommendation(BaseModel):
    variant: GarmentVariant
    result: Literal["Best fit", "Close match", "Not recommended"]
    chest_ease_cm: float
    waist_ease_cm: float
    score: int = Field(ge=0, le=100)
    reason: str
    rule_version: str


class InventoryAdjustment(BaseModel):
    delta: int = Field(ge=-1000, le=1000)
    expected_version: int | None = Field(default=None, ge=1)
