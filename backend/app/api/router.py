from fastapi import APIRouter

from .routes import catalogue, fit, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(catalogue.router, prefix="/catalogue", tags=["catalogue"])
api_router.include_router(fit.router, prefix="/fit", tags=["fit"])
