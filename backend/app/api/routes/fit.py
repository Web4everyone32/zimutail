from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas.fit import BodyMeasurements, FitRecommendation
from ...services.fit_service import recommend_variants

router = APIRouter()


@router.post("/recommendations", response_model=list[FitRecommendation])
def recommend(profile: BodyMeasurements, session: Annotated[Session, Depends(get_db)]) -> list[FitRecommendation]:
    return recommend_variants(session, profile)
