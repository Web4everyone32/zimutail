from fastapi import APIRouter

from ...schemas.fit import BodyMeasurements, FitRecommendation
from ...services.fit_service import recommend_variants

router = APIRouter()


@router.post("/recommendations", response_model=list[FitRecommendation])
def recommend(profile: BodyMeasurements) -> list[FitRecommendation]:
    return recommend_variants(profile)
