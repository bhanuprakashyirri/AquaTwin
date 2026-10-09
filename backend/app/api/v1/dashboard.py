"""Dashboard and farm metadata endpoints."""

from fastapi import APIRouter
from app.services.demo_data import FARM, FIELD_STATE, now_iso
from app.services.twin import run_full_simulation

router = APIRouter(tags=["dashboard"])


@router.get("/farms")
def list_farms() -> dict:
    return {"farms": [FARM]}


@router.get("/farms/{farm_id}")
def get_farm(farm_id: str) -> dict:
    return FARM


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


@router.get("/system/status")
def system_status() -> dict:
    return {
        "sensorStream": "DEMO",
        "weather": "UPDATED",
        "satelliteLastSync": now_iso(),
        "digitalTwin": "ACTIVE",
        "demoMode": True,
    }
