from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas.fit import GarmentVariant
from ...services.fit_service import list_variants

router = APIRouter()


@router.get("", response_model=list[GarmentVariant])
def catalogue(session: Annotated[Session, Depends(get_db)]) -> list[GarmentVariant]:
    return list_variants(session, available_only=True)


@router.get("/variants", response_model=list[GarmentVariant])
def variants(session: Annotated[Session, Depends(get_db)]) -> list[GarmentVariant]:
    return list_variants(session)
