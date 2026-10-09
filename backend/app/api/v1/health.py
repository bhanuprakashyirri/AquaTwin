"""Production health check endpoint."""

from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "aquatwin",
        "environment": settings.APP_ENV,
        "apiPrefix": settings.API_PREFIX,
    }
