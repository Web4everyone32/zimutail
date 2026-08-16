from typing import Literal

from pydantic import BaseModel, Field


class BodyMeasurements(BaseModel):
    chest: float = Field(gt=0)
    waist: float = Field(gt=0)
    hip: float = Field(gt=0)
    shoulder: float = Field(gt=0)
    sleeve: float = Field(gt=0)


class GarmentVariant(BodyMeasurements):
    id: int
    name: str
    sku: str
    size: str
    colour: str
    stock: int = Field(ge=0)


class FitRecommendation(BaseModel):
    variant: GarmentVariant
    result: Literal["Best fit", "Close match", "Not recommended"]
    chest_ease_cm: float
    rule_version: str
