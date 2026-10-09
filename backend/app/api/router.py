"""Centralized API Router aggregating all domain sub-routers."""

from fastapi import APIRouter

from app.api.v1 import (
    dashboard,
    field_twin,
    health,
    irrigation,
    simulation,
    weather,
)

router = APIRouter()
api_router = router

# Include v1 domain routers
router.include_router(health.router)
router.include_router(dashboard.router)
router.include_router(field_twin.router)
router.include_router(simulation.router)
router.include_router(irrigation.router)
router.include_router(weather.router)
