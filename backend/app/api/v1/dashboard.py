from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body

from app.db.database import (
    get_app_setting,
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
    available_water = get_app_setting(f"water_budget_l:{field_id}", 2000.0)

    forecast = _weather.get_forecast(lat, lon, 48)
    sim = run_full_simulation(pct, horizon=48, available_water=available_water, forecast=forecast, crop_kc=crop_kc)

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

    from app.core.ml_predictor import get_ml_recommendation
    ml_pred = get_ml_recommendation(
        kc=crop_kc,
        root_depth_mm=600, # default/mock for now
        field_capacity=0.27,
        wilting_point=0.13,
        temperature_c=forecast[0].get("temperatureC", 30) if forecast else 30,
        reference_et0_mm=forecast[0].get("et0Mm", 5.0) if forecast else 5.0,
        soil_moisture_prev_pct=pct,
        rew_prev=0.5, # default
        rain_forecast_24h_mm=forecast[0].get("rainMm", 0) if forecast else 0,
        water_deficit_mm=max(0, 0.27*600 - (pct/100)*600)
    )

    if ml_pred:
        factors.append({
            "label": "ML Prediction", 
            "value": f"{ml_pred['recommended_amount_mm']:.1f} mm" if ml_pred["irrigation_needed"] else "No irrigation needed", 
            "weight": 0.4
        })

    is_irrigate = best["key"].startswith("irrigate")
    if ml_pred and ml_pred["irrigation_needed"]:
        is_irrigate = True
        best["label"] = f"Irrigate ~{ml_pred['recommended_amount_mm']:.0f} mm (ML Optimized)"

    return {
        "action": "IRRIGATE" if is_irrigate else "WAIT",
        "headline": best["label"],
        "reason": (
            "Machine Learning model predicts optimal time to irrigate based on recent data."
            if (ml_pred and ml_pred["irrigation_needed"]) else
            ("Current root-zone moisture is sufficient for the forecast window." if not is_irrigate else "Root-zone moisture is approaching the refill threshold.")
        ),
        "waterSavedL": round(saved, 0),
        "availableWaterL": round(available_water, 0),
        "waterUsedL": round(best["waterUsedL"], 0),
        "stressRiskPct": best["stressRiskPct"],
        "confidencePct": 95 if ml_pred else (85 if forecast else 60),
        "nextEvaluationAt": "in 6 hours",
        "factors": factors,
        "recommendedKey": "irrigate_now" if is_irrigate else best["key"],
        "status": "active",
        "mlPrediction": ml_pred
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


@router.get("/prototype-data")
def get_prototype_data(lat: float = 16.5449, lon: float = 81.5212) -> dict:
    """Returns aggregated site data: live weather, ML crop insights, water resources."""
    # 1. Live Weather
    forecast = _weather.get_forecast(lat, lon, 48)
    temp_now = forecast[0].get("temperatureC", 0.0) if forecast else 0.0
    rain_prob = max((f.get("rainProbabilityPct", 0) for f in (forecast[:12] if forecast else [])), default=0)
    rain_24h = sum(f.get("rainfallMm", 0) for f in (forecast[:24] if forecast else []))

    # 2. Water Resource / Soil (mocked for the selected coords based on typical field-a)
    pct = 19.5
    available_budget = 1500  # liters or mm

    # 3. Crop ML Data
    from app.core.ml_predictor import get_ml_recommendation
    ml_pred = get_ml_recommendation(
        kc=1.15,
        root_depth_mm=600,
        field_capacity=0.27,
        wilting_point=0.13,
        temperature_c=temp_now,
        reference_et0_mm=forecast[0].get("et0Mm", 5.0) if forecast else 5.0,
        soil_moisture_prev_pct=pct,
        rew_prev=0.4,
        rain_forecast_24h_mm=rain_24h,
        water_deficit_mm=max(0, 0.27*600 - (pct/100)*600)
    )

    return {
        "location": {"lat": lat, "lng": lon},
        "weather": {
            "tempNowC": temp_now,
            "rainProbability12h": rain_prob,
            "rainExpected24hMm": rain_24h,
            "source": _weather.source_label
        },
        "waterResource": {
            "soilMoisturePct": pct,
            "waterBudgetRemainingL": available_budget,
            "soilType": "Loam"
        },
        "cropML": ml_pred or {
            "irrigation_needed": False,
            "recommended_amount_mm": 0.0,
            "note": "ML model unavailable"
        }
    }
