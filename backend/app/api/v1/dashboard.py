from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body

from app.db.database import (
    get_farms,
    get_farm,
    get_field,
    get_field_state,
    get_sensors,
    save_user_farm,
    update_user_farm,
    delete_user_farm,
)
from app.services.adapters import OpenMeteoWeatherProvider
from app.services.twin import run_full_simulation, now_iso

router = APIRouter(tags=["dashboard"])

_weather = OpenMeteoWeatherProvider()


@router.get("/farms")
def list_farms(user_id: Optional[str] = Query(None, alias="user_id")) -> dict:
    farms = get_farms(user_id=user_id)
    return {"farms": farms}


@router.post("/farms")
def create_farm(payload: Dict[str, Any] = Body(...)) -> dict:
    user_id = payload.get("user_id") or payload.get("userId") or "authenticated-user"
    farm = save_user_farm(payload, user_id=user_id)
    return {"farm": farm}


@router.put("/farms/{farm_id}")
def update_farm(farm_id: str, payload: Dict[str, Any] = Body(...)) -> dict:
    user_id = payload.get("user_id") or payload.get("userId") or "authenticated-user"
    farm = update_user_farm(farm_id, payload, user_id=user_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or unauthorized")
    return {"farm": farm}


@router.delete("/farms/{farm_id}")
def delete_farm(farm_id: str, user_id: Optional[str] = Query(None, alias="user_id")) -> dict:
    uid = user_id or "authenticated-user"
    success = delete_user_farm(farm_id, user_id=uid)
    if not success:
        raise HTTPException(status_code=404, detail="Farm not found or unauthorized")
    return {"success": True}


@router.get("/farms/{farm_id}")
def get_farm_by_id(farm_id: str) -> dict:
    farm = get_farm(farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.get("/recommendation")
def recommendation(field_id: str = "field-a") -> dict:
    field = get_field(field_id)
    state = get_field_state(field_id)

    if not field or not state:
        return {
            "action": "TELEMETRY_UNAVAILABLE",
            "headline": "Telemetry Unavailable",
            "reason": "Soil sensor telemetry or digital twin baseline is not currently recorded for this field. Connect soil sensors to enable AI irrigation recommendations.",
            "waterSavedL": 0.0,
            "stressRiskPct": 0.0,
            "confidencePct": 0.0,
            "nextEvaluationAt": "Pending sensor connection",
            "factors": [],
            "status": "unavailable",
        }

    pct = state["root_zone_moisture_pct"]
    lat = field.get("latitude", 16.54)
    lon = field.get("longitude", 81.52)
    crop_kc = field.get("crop", {}).get("cropCoefficient", 1.15)

    forecast = _weather.get_forecast(lat, lon, 48)
    sim = run_full_simulation(pct, horizon=48, available_water=2000, forecast=forecast, crop_kc=crop_kc)

    best = next((s for s in sim["scenarios"] if s["recommended"]), sim["scenarios"][0])
    saved = max(0.0, 720 - best["waterUsedL"])

    rain_prob = 0
    if forecast and len(forecast) > 0:
        rain_prob = max(f.get("rainProbabilityPct", 0) for f in forecast[:12])

    factors = [
        {"label": "Root-zone moisture", "value": f"{pct}%", "weight": 0.3},
        {"label": "Rain probability (12h)", "value": f"{rain_prob}%", "weight": 0.28},
        {"label": "Predicted min moisture if waiting", "value": f"{best['minMoisturePct']}%", "weight": 0.22},
        {"label": "Crop stage", "value": field.get("crop", {}).get("growthStage", "Active Vegetative"), "weight": 0.2},
    ]

    return {
        "action": best["label"].upper(),
        "headline": best["label"],
        "reason": (
            "Current root-zone moisture is sufficient for the forecast window and "
            "precipitation is expected. Deferring irrigation prevents water waste."
            if best["key"].startswith("wait")
            else "Root-zone moisture is approaching the refill threshold; irrigating now prevents crop stress."
        ),
        "waterSavedL": round(saved, 0),
        "stressRiskPct": best["stressRiskPct"],
        "confidencePct": 85 if forecast else 60,
        "nextEvaluationAt": "in 6 hours",
        "factors": factors,
        "recommendedKey": sim["recommendedKey"],
        "status": "active",
    }


@router.get("/system/status")
def system_status(field_id: Optional[str] = None) -> dict:
    sensors = get_sensors(field_id or "field-a")
    has_live_sensors = any(s.get("status") == "live" for s in sensors)

    return {
        "sensorStream": "LIVE" if has_live_sensors else "OFFLINE",
        "weather": "CONNECTED",
        "satelliteLastSync": None,
        "digitalTwin": "ACTIVE" if sensors else "IDLE",
        "demoMode": False,
    }
