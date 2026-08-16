from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas.fit import GarmentVariant, InventoryAdjustment
from ...services.fit_service import InventoryConflictError, adjust_inventory

router = APIRouter()


@router.patch("/{variant_id}", response_model=GarmentVariant)
def update_inventory(
    variant_id: int,
    adjustment: InventoryAdjustment,
    session: Annotated[Session, Depends(get_db)],
) -> GarmentVariant:
    try:
        return adjust_inventory(session, variant_id, adjustment)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except InventoryConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
