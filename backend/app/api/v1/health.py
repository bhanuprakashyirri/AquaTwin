"""Health endpoint."""

from fastapi import APIRouter
from app.services.demo_data import FARM as DEMO_FARM

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "aquatwin", "farm": DEMO_FARM["name"]}
