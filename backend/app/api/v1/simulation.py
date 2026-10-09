"""What-If Simulation endpoints — scenario projections and rain uncertainty."""

from fastapi import APIRouter
from app.services.twin import (
    rain_uncertainty,
    run_full_simulation,
)

router = APIRouter(tags=["simulation"])


@router.post("/simulation/run")
def simulation_run(body: dict) -> dict:
    start = float(body.get("startMoisturePct", 24.6))
    horizon = int(body.get("horizonHours", 48))
    water = float(body.get("availableWaterL", 2000))
    return run_full_simulation(start, horizon, water)


@router.post("/simulation/rain-uncertainty")
def simulation_rain(body: dict) -> dict:
    return {"scenarios": rain_uncertainty(body.get("strategy", "wait6"))}
