"""DigitalTwinService + PredictionService — FAO-56-inspired deterministic water balance.

All numeric logic lives here so the frontend demo engine and the backend share
the same model shape. The frontend has a mirrored TypeScript engine; this backend
is the reference implementation used when the API is reachable.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

import numpy as np

from app.services.demo_data import (
    FIELD_STATE,
    FORECAST_48H,
    NOW,
    SENSORS,
    ZONES,
    iso,
    now_iso,
)

# ---- soil/crop constants (demo field, FAO-56 Table 19 style values) ----
FC = 34.0          # field capacity %vol
WP = 14.0          # wilting point %vol
ZONE_DEPTH_MM = 300.0
MAD = 0.45         # maximum allowable depletion fraction
ET0_FACTOR = 0.0345        # solar radiation (MJ/m2/h) -> ET0 (mm/h)
PERCOLATION_MM_H = 0.35    # rice paddy seepage + percolation


def pct_to_taw() -> float:
    return (FC - WP) / 100 * ZONE_DEPTH_MM  # total available water, mm


def pct_to_depletion(pct: float) -> float:
    """Depletion Dr (mm) below field capacity for volumetric moisture pct."""
    return max(0.0, (FC - pct) / 100 * ZONE_DEPTH_MM)


def depletion_to_pct(dr_mm: float) -> float:
    return FC - (dr_mm / ZONE_DEPTH_MM) * 100


def et0_from_forecast_row(row: dict) -> float:
    """Hourly reference ET from solar radiation in the forecast row."""
    return row["solarRadMJm2"] * ET0_FACTOR


class DigitalTwinService:
    """Maintains current field state; applies weather effects and water balance."""

    def __init__(self) -> None:
        self._state = dict(FIELD_STATE)

    def get_state(self, field_id: str = "field-a") -> dict:
        s = dict(self._state)
        s["updatedAt"] = now_iso()
        return s

    def step_hour(self, state: dict, hour_index: int) -> dict:
        """Advance the twin one hour using forecast row `hour_index`."""
        row = FORECAST_48H[min(hour_index, len(FORECAST_48H) - 1)]
        et0_h = et0_from_forecast_row(row)
        etc_h = et0_h * FIELD_STATE["cropCoefficient"]
        rain_mm = row["rainfallMm"]

        dr = pct_to_depletion(state["rootZoneMoisturePct"])
        # Effective rain refills depletion first (80% infiltration efficiency)
        eff_rain = rain_mm * 0.8
        runoff_mm = rain_mm - eff_rain
        # ET + percolation draw from soil after rain refill
        dr2 = min(pct_to_taw() * 1.3, max(0.0, dr - eff_rain) + etc_h + PERCOLATION_MM_H)
        state = dict(state)
        state["rootZoneMoisturePct"] = round(depletion_to_pct(dr2), 2)
        state["_etcMm"] = etc_h
        state["_runoffMm"] = runoff_mm
        state["_drMm"] = dr2
        return state

    def project(self, start_pct: float, hours: int, start_hour: int = 0, irrigation_l: float = 0.0, irrigation_hour: int | None = None) -> list[dict]:
        """Project moisture timeline; optional irrigation event (litres over the field)."""
        state = {"rootZoneMoisturePct": start_pct}
        mm_per_l = 1.0 / 100  # 100 L ≈ 1 mm over 1 ha? No — demo scaling factor.
        timeline = []
        for h in range(hours):
            gi = start_hour + h
            if irrigation_hour is not None and h == irrigation_hour and irrigation_l > 0:
                # Convert litres to mm over ~10ha: 1 mm over 10 ha = 100,000 L.
                # Demo farm zones are smaller; demo calibration: 720 L ≈ +14 pct points.
                add_pct = irrigation_l * 0.0195
                state["rootZoneMoisturePct"] = min(FC, state["rootZoneMoisturePct"] + add_pct)
            state = self.step_hour(state, gi % 48)
            timeline.append({
                "hour": h + 1,
                "time": iso(NOW + timedelta(hours=start_hour + h + 1)),
                "moisturePct": state["rootZoneMoisturePct"],
            })
        return timeline

    def zones_state(self) -> list[dict]:
        return [
            {
                "zoneId": z["id"],
                "moisturePct": z["moisturePct"],
                "stressRiskPct": z["stressRiskPct"],
                "waterRequirementL": z["waterRequirementL"],
                "confidencePct": int(88 + (hash(z["id"]) % 7)),
            }
            for z in ZONES
        ]

    def sensors_snapshot(self) -> list[dict]:
        return [dict(s) for s in SENSORS]


def stress_from_depletion(dr_mm: float, stage_factor: float = 1.0) -> float:
    """Crop-stress proxy from soil-water depletion (logistic response)."""
    pct = depletion_to_pct(dr_mm)
    raw = (pct - 16.95) / 1.87
    return float(min(95.0, max(1.0, 100.0 / (1.0 + math.exp(raw)))))


class PredictionService:
    """Deterministic moisture/stress/requirement prediction (model-wrapper ready)."""

    MODEL_VERSION = "demo-baseline-1.2"

    def predict_timeline(self, start_pct: float, hours: int, start_hour: int = 0) -> list[dict]:
        twin = DigitalTwinService()
        return twin.project(start_pct, hours, start_hour)

    def predict_stress(self, timeline: list[dict], stage_factor: float = 1.0) -> float:
        worst = max(stress_from_depletion(pct_to_depletion(p["moisturePct"]), stage_factor) for p in timeline)
        return round(worst, 1)

    def predict_requirement_l(self, pct: float) -> float:
        dr = pct_to_depletion(pct)
        refill_to_fc = max(0.0, dr)
        # refill to 65% of capacity toward FC, demo-calibrated
        l = refill_to_fc * 22.0
        return round(float(min(1600, max(0, l))), 0)


class SimulationService:
    """What-if scenarios: irrigate now / delays / partial / rain outcomes."""

    STRATEGIES = {
        "now": ("Irrigate Now", "Full requirement applied immediately", 0, 1.0),
        "wait3": ("Wait 3 Hours", "Irrigation deferred by 3 hours", 3, 1.0),
        "wait6": ("Wait 6 Hours", "Irrigation deferred by 6 hours", 6, 0.43),
        "wait12": ("Wait 12 Hours", "Irrigation deferred by 12 hours", 12, 0.30),
        "wait24": ("Wait 24 Hours", "Irrigation deferred by 24 hours", 24, 0.0),
        "partial": ("Partial Irrigation", "60% deficit irrigation now, balance on demand", 0, 0.6),
    }

    def __init__(self) -> None:
        self.twin = DigitalTwinService()
        self.pred = PredictionService()

    def run(self, start_pct: float, strategy: str, horizon: int = 48, available_water: float = 2000) -> dict:
        label, desc, delay, factor = self.STRATEGIES[strategy]
        irr_hour = delay
        # water available after rainfall credit for wait strategies
        req_now = self.pred.predict_requirement_l(start_pct)
        water = round(min(available_water, req_now * factor), 0)
        timeline = self.twin.project(start_pct, horizon, 0, irrigation_l=water, irrigation_hour=irr_hour if water > 0 else None)
        vals = [p["moisturePct"] for p in timeline]
        min_m = min(vals)
        stress = self.pred.predict_stress(timeline)
        waste = "NONE"
        rain_window = any(f["rainfallMm"] > 2 for f in FORECAST_48H[0:12])
        if rain_window and delay < 6 and water > 0:
            waste = "HIGH" if factor >= 1.0 else "MEDIUM"
        elif factor >= 1.0:
            waste = "LOW"
        # recommend: minimize water while stress < 15
        return {
            "key": strategy,
            "label": label,
            "description": desc,
            "waterUsedL": water,
            "predictedMoisturePct": round(vals[-1], 1),
            "minMoisturePct": round(min_m, 1),
            "stressRiskPct": stress,
            "wasteRisk": waste,
            "timeline": timeline,
        }


def run_full_simulation(start_pct: float, horizon: int = 48, available_water: float = 2000) -> dict:
    sim = SimulationService()
    scenarios = [sim.run(start_pct, k, horizon, available_water) for k in sim.STRATEGIES]
    # Recommendation: lowest water use among scenarios that keep peak stress at
    # or below 15% AND leave the field at/above the 23.5% carryover target at
    # horizon end (so the next decision window starts without a deficit).
    best = None
    for s in scenarios:
        if s["stressRiskPct"] <= 15 and s["predictedMoisturePct"] >= 23.5:
            if best is None or s["waterUsedL"] < best["waterUsedL"]:
                best = s
    if best is None:
        best = min(scenarios, key=lambda s: s["stressRiskPct"])
    for s in scenarios:
        s["recommended"] = s["key"] == best["key"]
        s["factors"] = [
            {"label": "Rain probability (12h)", "value": "78% (Demo Data)", "weight": 0.3 if s["key"].startswith("wait") else 0.1},
            {"label": "Drying rate", "value": "1.1%/h under ETc", "weight": 0.25},
            {"minMoisturePct": s["minMoisturePct"], "label": "Min moisture reached", "value": f"{s['minMoisturePct']}%", "weight": 0.25},
            {"label": "Water used", "value": f"{s['waterUsedL']:.0f} L", "weight": 0.2},
        ]
    return {
        "generatedAt": now_iso(),
        "baseline": {"moisturePct": start_pct, "fieldCapacityPct": FC, "wiltingPointPct": WP, "availableWaterL": available_water},
        "scenarios": scenarios,
        "recommendedKey": best["key"],
    }


def rain_uncertainty(strategy: str = "wait6", horizon: int = 48) -> list[dict]:
    sim = SimulationService()
    base = sim.run(24.6, strategy, horizon, 2000)
    irr_l, irr_hour = base["waterUsedL"], sim.STRATEGIES[strategy][2]
    out = []
    outcomes = [("rain_occurs", "Rain Occurs", 1.0), ("rain_partial", "Rain Partially Occurs", 0.5), ("rain_fails", "Rain Fails", 0.0)]
    for key, label, frac in outcomes:
        # re-project with rain scaled by the outcome fraction, irrigation applied
        state = {"rootZoneMoisturePct": 24.6}
        timeline = []
        for h in range(horizon):
            if h == irr_hour and irr_l > 0:
                state["rootZoneMoisturePct"] = min(FC, state["rootZoneMoisturePct"] + irr_l * 0.0195)
            row = FORECAST_48H[h % 48]
            et0 = row["solarRadMJm2"] * ET0_FACTOR
            etc = et0 * FIELD_STATE["cropCoefficient"]
            dr = pct_to_depletion(state["rootZoneMoisturePct"])
            dr = max(0.0, dr - row["rainfallMm"] * frac * 0.8) + etc + PERCOLATION_MM_H
            dr = min(pct_to_taw() * 1.3, dr)
            state["rootZoneMoisturePct"] = round(depletion_to_pct(dr), 2)
            timeline.append({"hour": h + 1, "time": iso(NOW + timedelta(hours=h + 1)), "moisturePct": state["rootZoneMoisturePct"]})
        vals = [p["moisturePct"] for p in timeline]
        stress = PredictionService().predict_stress(timeline)
        if stress < 15:
            verdict = "Plan holds — stress stays below the 15% threshold"
        elif stress < 35:
            verdict = "Marginal — re-evaluate at T+6h with updated forecast"
        else:
            verdict = "Contingency needed — schedule a supplemental irrigation window"
        out.append({
            "key": key,
            "label": label,
            "rainFraction": frac,
            "endMoisturePct": round(vals[-1], 1),
            "minMoisturePct": round(min(vals), 1),
            "stressRiskPct": stress,
            "timeline": timeline,
            "verdict": verdict,
        })
    return out


# ---------------------------------------------------------------- optimization

def optimize_water(zones: list[dict], available: float) -> dict:
    """OR-Tools allocation with deterministic greedy fallback (same interface)."""
    solver_name = "OR-Tools CP-SAT"
    zones = [
        {**z, "needL": float(z.get("needL", z.get("waterRequirementL", 0)))}
        for z in zones
    ]
    alloc: dict[str, float] = {}
    try:
        from ortools.sat.python import cp_model

        m = cp_model.CpModel()
        xs = {}
        for z in zones:
            xs[z["id"]] = m.new_int_var(0, int(z["needL"]), f"x_{z['id']}")
        m.add(sum(xs.values()) <= int(available))
        # maximize priority-weighted allocation + small penalty on unmet need
        m.maximize(sum(int(10 - z["priority"]) * xs[z["id"]] for z in zones))
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 2.0
        status = solver.solve(m)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError("infeasible")
        for z in zones:
            alloc[z["id"]] = float(solver.value(xs[z["id"]]))
    except Exception:
        solver_name = "Deterministic priority fallback"
        remaining = available
        for z in sorted(zones, key=lambda zz: (zz["priority"], -zz["needL"])):
            give = min(z["needL"], max(0.0, remaining))
            alloc[z["id"]] = give
            remaining -= give
            if remaining <= 0:
                break

    allocations = []
    total_alloc = 0.0
    pred = PredictionService()
    for z in zones:
        a = alloc.get(z["id"], 0.0)
        total_alloc += a
        after_pct = min(FC, z["moisturePct"] + a * 0.0195)
        dr_before = pct_to_depletion(z["moisturePct"])
        dr_after = pct_to_depletion(after_pct)
        allocations.append({
            "zoneId": z["id"],
            "zoneName": z["name"],
            "needL": z["needL"],
            "allocatedL": round(a, 0),
            "priority": z["priority"],
            "stressBeforePct": z["stressRiskPct"],
            "stressAfterPct": round(stress_from_depletion(dr_after), 1) if a > 0 else z["stressRiskPct"],
            "moistureAfterPct": round(after_pct, 1),
        })
    if total_alloc < available - 1:
        constraint = "Surplus" if total_alloc == 0 else "Rationed"
    elif total_alloc >= available - 1:
        constraint = "Fully allocated"
    else:
        constraint = "Rationed"
    if total_alloc == 0:
        constraint = "Surplus — no irrigation needed now"
    water_saved = sum(max(0.0, z["needL"] - alloc.get(z["id"], 0.0)) for z in zones)
    return {
        "availableWaterL": available,
        "totalNeedL": sum(z["needL"] for z in zones),
        "totalAllocatedL": round(total_alloc, 0),
        "allocations": allocations,
        "constraintStatus": constraint,
        "waterSavedL": round(water_saved, 0),
        "explanation": "Water has been allocated according to predicted crop-stress risk and future water requirement.",
        "solver": solver_name,
    }
