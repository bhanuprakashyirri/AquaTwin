"""What-If Simulation endpoints — physics-based projections and rain uncertainty."""

from fastapi import APIRouter
from app.db.database import get_field
from app.services.adapters import OpenMeteoWeatherProvider
from app.services.twin import (
    rain_uncertainty,
    run_full_simulation,
)

router = APIRouter(tags=["simulation"])

_weather = OpenMeteoWeatherProvider()


@router.post("/simulation/run")
def simulation_run(body: dict) -> dict:
    start = float(body.get("startMoisturePct", 24.6))
    horizon = int(body.get("horizonHours", 48))
    water = float(body.get("availableWaterL", 2000))
    field_id = body.get("fieldId", "field-a")

    field = get_field(field_id)
    lat = field.get("latitude", 16.54) if field else 16.54
    lon = field.get("longitude", 81.52) if field else 81.52
    crop_kc = field.get("crop", {}).get("cropCoefficient", 1.15) if field else 1.15

    forecast = _weather.get_forecast(lat, lon, horizon)
    return run_full_simulation(start, horizon, water, forecast=forecast, crop_kc=crop_kc)


@router.post("/simulation/rain-uncertainty")
def simulation_rain(body: dict) -> dict:
    strategy = body.get("strategy", "wait6")
    start = float(body.get("startMoisturePct", 24.6))
    field_id = body.get("fieldId", "field-a")

    field = get_field(field_id)
    lat = field.get("latitude", 16.54) if field else 16.54
    lon = field.get("longitude", 81.52) if field else 81.52
    crop_kc = field.get("crop", {}).get("cropCoefficient", 1.15) if field else 1.15

    forecast = _weather.get_forecast(lat, lon, 48)
    return {"scenarios": rain_uncertainty(strategy, start_pct=start, horizon=48, forecast=forecast, crop_kc=crop_kc)}
