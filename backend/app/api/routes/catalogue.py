from fastapi import APIRouter

from ...schemas.fit import GarmentVariant
from ...services.fit_service import list_available_variants

router = APIRouter()


@router.get("", response_model=list[GarmentVariant])
def catalogue() -> list[GarmentVariant]:
    return list_available_variants()
