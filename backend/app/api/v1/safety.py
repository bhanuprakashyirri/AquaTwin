"""Missed-Rain Protection & Electricity-Slot Safety endpoints.

Exposes the slot-aware decision engine that prevents "skip irrigation because
rain is forecast" advice from becoming a crop-water disaster when the forecast
is wrong and the next agricultural power slot is far away.

Dataset backing: calibration evidence (crop MAD thresholds, forecast-
reliability downweights, water-budget spread) lives in
app/services/missed_rain_safety.py and is documented in dataset/dataset_meta.json.
"""

from __future__ import annotations

import csv
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter

from app.services.missed_rain_safety import (
    DEFAULT_SAFETY_POLICY,
    CROP_PROFILES,
    evaluate_irrigation_recommendation,
    parse_slots,
    backtest_against_datasets,
)

router = APIRouter(tags=["safety"])

_DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "dataset"))


# ---------------------------------------------------------------------------
# Dataset access helpers (from the dataset/ folder provided by the user)
# ---------------------------------------------------------------------------
def _dataset_path(name: str) -> str:
    return os.path.join(_DATASET_DIR, name)


def snapshot_crop_parameters() -> Dict[str, Any]:
    """Crops supported by the safety engine + their calibrated MAD thresholds."""
    return {c: dict(mad=v["mad"], stage_sensitivity=v["stage_sensitivity"]) for c, v in CROP_PROFILES.items()}


def snapshot_policy() -> Dict[str, Any]:
    return dict(DEFAULT_SAFETY_POLICY)


def _parse_iso(ts: str) -> datetime:
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/safety/missed-rain")
def missed_rain_recommendation(body: dict) -> dict:
    """Compute the protective irrigation decision for the current power slot.

    Request body:
      field_state: {theta (volumetric fraction), root_depth_mm, soil_texture, crop_key,
                    growth_stage, irrigation_efficiency, water_budget_mm, pond_mm,
                    data_generated_at (optional)}
      power_slots: [{start (ISO), hours, reliable} ...]  # current + future
      daily_forecast: [{rain_mm, et0_mm, kc, rain_probability, hours_since_issue} ...]
      policy_overrides: (optional) {max_acceptable_stress, max_saturation_fraction, ...}
    """
    field_state = body.get("field_state") or {}
    power_slots = body.get("power_slots") or []
    daily_forecast = body.get("daily_forecast") or []
    policy_overrides = body.get("policy_overrides") or {}
    now = body.get("now")
    now_dt = _parse_iso(now) if isinstance(now, str) else None

    if not field_state:
        return {
            "status": "unavailable",
            "message": "field_state is required for the missed-rain safety evaluation.",
            "policy": snapshot_policy(),
            "crops": snapshot_crop_parameters(),
        }

    result = evaluate_irrigation_recommendation(
        field_state=field_state,
        power_slots=power_slots,
        daily_forecast=daily_forecast,
        policy_overrides=policy_overrides or None,
        now=now_dt,
    )
    result["status"] = "ok"
    return result


@router.get("/safety/policy")
def safety_policy() -> dict:
    """Return the configurable safety policy + calibrated crop thresholds."""
    return {
        "policy": snapshot_policy(),
        "crops": snapshot_crop_parameters(),
        "dataset": backtest_against_datasets(),
    }
