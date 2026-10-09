"""Irrigation optimization, history, and water fingerprint endpoints."""

from fastapi import APIRouter
from app.services.adapters import DemoWeatherProvider
from app.services.demo_data import (
    IRRIGATION_HISTORY,
    ZONES,
)
from app.services.twin import (
    PredictionService,
    optimize_water,
)

router = APIRouter(tags=["irrigation"])

_weather = DemoWeatherProvider()


@router.post("/water-budget/optimize")
def water_budget_optimize(body: dict) -> dict:
    available = float(body.get("availableWaterL", 2000))
    return optimize_water(ZONES, available)


@router.get("/fields/{field_id}/history")
def field_history(field_id: str) -> dict:
    return {"events": IRRIGATION_HISTORY}


@router.get("/analytics/water-fingerprint")
def water_fingerprint(field_id: str = "field-a") -> dict:
    return {
        "moistureRetention": 72,
        "dryingRatePctPerDay": 4.6,
        "irrigationResponsePct": 13.8,
        "rainResponsePct": 9.2,
        "recoveryHours": 26,
        "notes": [
            "Clay-loam subzones retain moisture roughly 30% longer than sandy-loam subzones.",
            "Night-time ETc drops irrigation demand by ~40% versus midday peaks.",
            "The model learns how this field responds to irrigation and environmental conditions.",
        ],
    }


@router.get("/analytics/summary")
def analytics_summary(field_id: str = "field-a") -> dict:
    pred = PredictionService()
    timeline = pred.predict_timeline(26.0, 168)
    return {
        "moistureTimeline": timeline,
        "history": IRRIGATION_HISTORY,
        "forecast": _weather.get_forecast(48),
        "observations": _weather.get_observations(7),
    }
