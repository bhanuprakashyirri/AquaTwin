"""API routes — farms, fields, weather, satellite, sensors, twin, simulation, optimization."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.adapters import (
    DemoSatelliteProvider,
    DemoSensorProvider,
    DemoWeatherProvider,
)
from app.services.demo_data import (
    FORECAST_48H,
    FARM,
    FIELD,
    FIELD_STATE,
    IRRIGATION_HISTORY,
    ZONES,
    now_iso,
)
from app.services.twin import (
    DigitalTwinService,
    PredictionService,
    rain_uncertainty,
    run_full_simulation,
    optimize_water,
)

router = APIRouter()
api_router = router

_weather = DemoWeatherProvider()
_satellite = DemoSatelliteProvider()
_sensors = DemoSensorProvider()
_twin = DigitalTwinService()
_pred = PredictionService()


@router.get("/farms")
def list_farms() -> dict:
    return {"farms": [FARM]}


@router.get("/farms/{farm_id}")
def get_farm(farm_id: str) -> dict:
    return FARM


@router.get("/fields/{field_id}")
def get_field(field_id: str) -> dict:
    return FIELD


@router.get("/fields/{field_id}/state")
def field_state(field_id: str) -> dict:
    return _twin.get_state(field_id)


@router.get("/fields/{field_id}/zones")
def field_zones(field_id: str) -> dict:
    return {"zones": ZONES, "zoneStates": _twin.zones_state()}


@router.get("/fields/{field_id}/weather")
def field_weather(field_id: str) -> dict:
    return {
        "source": _weather.source_label,
        "forecast": _weather.get_forecast(48),
        "observations": _weather.get_observations(7),
        "summary": {
            "nextRainProbabilityPct": next_rain_summary()["probabilityPct"],
            "nextRainInHours": next_rain_summary()["inHours"],
            "tempNowC": _weather.get_forecast(1)[0]["temperatureC"],
        },
    }


@router.get("/fields/{field_id}/satellite")
def field_satellite(field_id: str) -> dict:
    return {"source": _satellite.source_label, "series": _satellite.get_series()}


@router.get("/fields/{field_id}/sensors")
def field_sensors(field_id: str) -> dict:
    return {"source": _sensors.source_label, "sensors": _sensors.get_sensors()}


@router.get("/fields/{field_id}/history")
def field_history(field_id: str) -> dict:
    return {"events": IRRIGATION_HISTORY}


@router.post("/simulation/run")
def simulation_run(body: dict) -> dict:
    start = float(body.get("startMoisturePct", 24.6))
    horizon = int(body.get("horizonHours", 48))
    water = float(body.get("availableWaterL", 2000))
    return run_full_simulation(start, horizon, water)


@router.post("/simulation/rain-uncertainty")
def simulation_rain(body: dict) -> dict:
    return {"scenarios": rain_uncertainty(body.get("strategy", "wait6"))}


@router.post("/water-budget/optimize")
def water_budget_optimize(body: dict) -> dict:
    available = float(body.get("availableWaterL", 2000))
    return optimize_water(ZONES, available)


@router.get("/recommendation")
def recommendation(field_id: str = "field-a") -> dict:
    pct = FIELD_STATE["rootZoneMoisturePct"]
    sim = run_full_simulation(pct)
    best = next(s for s in sim["scenarios"] if s["recommended"])
    saved = max(0.0, 720 - best["waterUsedL"])  # vs. irrigate-now baseline
    factors = [
        {"label": "Root-zone moisture", "value": f"{pct}%", "weight": 0.3},
        {"label": "Rain probability (12h)", "value": "78%", "weight": 0.28},
        {"label": "Predicted min moisture if waiting", "value": f"{best['minMoisturePct']}%", "weight": 0.22},
        {"label": "Crop stage", "value": "Reproductive — high demand", "weight": 0.2},
    ]
    return {
        "action": best["label"].upper(),
        "headline": best["label"],
        "reason": (
            "Current root-zone moisture is sufficient for approximately 6 hours and "
            "rainfall probability is high. Waiting is predicted to reduce unnecessary "
            "irrigation while keeping crop-stress risk below the configured threshold."
            if best["key"].startswith("wait")
            else "Root-zone moisture is approaching the refill point and no effective rain is expected in time; irrigating now minimises predicted crop stress."
        ),
        "waterSavedL": round(saved, 0),
        "stressRiskPct": best["stressRiskPct"],
        "confidencePct": 87,
        "nextEvaluationAt": "in 6 hours",
        "factors": factors,
        "recommendedKey": sim["recommendedKey"],
    }


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


@router.get("/system/status")
def system_status() -> dict:
    return {
        "sensorStream": "DEMO",
        "weather": "UPDATED",
        "satelliteLastSync": now_iso(),
        "digitalTwin": "ACTIVE",
        "demoMode": True,
    }


def next_rain_summary() -> dict:
    for h, row in enumerate(FORECAST_48H):
        if row["rainProbabilityPct"] >= 50 and row["rainfallMm"] > 0.5:
            return {"probabilityPct": row["rainProbabilityPct"], "inHours": h}
    row = FORECAST_48H[0]
    return {"probabilityPct": row["rainProbabilityPct"], "inHours": 0}


FORECAST_NEXT_RAIN_PCT = 68
FORECAST_NEXT_RAIN_H = 7


@router.websocket("/ws/field/{field_id}")
async def ws_field(websocket: WebSocket, field_id: str) -> None:
    await websocket.accept()
    step = 0
    try:
        while True:
            frame = {
                "type": "sensor_frame",
                "step": step,
                "timestamp": now_iso(),
                "source": _sensors.source_label,
                "sensors": _sensors.tick(step),
            }
            await websocket.send_text(json.dumps(frame))
            step += 1
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        return
