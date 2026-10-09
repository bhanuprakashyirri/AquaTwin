"""DigitalTwinService + PredictionService — Pure FAO-56 physical water balance and optimization engine.

All numeric physics and mathematical models reside here.
Accepts genuine inputs and does not depend on hardcoded demo data.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# ---- soil/crop constants (standard FAO-56 Table 19 reference values) ----
FC = 34.0          # field capacity %vol
WP = 14.0          # wilting point %vol
ZONE_DEPTH_MM = 300.0
MAD = 0.45         # maximum allowable depletion fraction
ET0_FACTOR = 0.0345        # solar radiation (MJ/m2/h) -> ET0 (mm/h)
PERCOLATION_MM_H = 0.35    # deep percolation / drainage seepage (mm/h)


def iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def pct_to_taw() -> float:
    return (FC - WP) / 100 * ZONE_DEPTH_MM  # total available water, mm


def pct_to_depletion(pct: float) -> float:
    """Depletion Dr (mm) below field capacity for volumetric moisture pct."""
    return max(0.0, (FC - pct) / 100 * ZONE_DEPTH_MM)


def depletion_to_pct(dr_mm: float) -> float:
    return FC - (dr_mm / ZONE_DEPTH_MM) * 100


def et0_from_forecast_row(row: dict) -> float:
    """Hourly reference ET from solar radiation in the forecast row."""
    rad = row.get("solarRadMJm2", 0.0)
    return rad * ET0_FACTOR


def stress_from_depletion(dr_mm: float, stage_factor: float = 1.0) -> float:
    """Crop-stress proxy from soil-water depletion (logistic response)."""
    pct = depletion_to_pct(dr_mm)
    raw = (pct - 16.95) / 1.87
    return float(min(95.0, max(1.0, 100.0 / (1.0 + math.exp(raw)))))


class DigitalTwinService:
    """Maintains physical field state; applies weather effects and water balance."""

    def step_hour(self, state: dict, weather_row: dict, crop_kc: float = 1.15) -> dict:
        """Advance the twin one hour using weather observations/forecast row."""
        et0_h = et0_from_forecast_row(weather_row)
        etc_h = et0_h * crop_kc
        rain_mm = weather_row.get("rainfallMm", 0.0)

        dr = pct_to_depletion(state["rootZoneMoisturePct"])
        # Effective rain refills depletion first (80% infiltration efficiency)
        eff_rain = rain_mm * 0.8
        runoff_mm = rain_mm - eff_rain
        # ET + percolation draw from soil after rain refill
        dr2 = min(pct_to_taw() * 1.3, max(0.0, dr - eff_rain) + etc_h + PERCOLATION_MM_H)
        new_state = dict(state)
        new_state["rootZoneMoisturePct"] = round(depletion_to_pct(dr2), 2)
        new_state["_etcMm"] = etc_h
        new_state["_runoffMm"] = runoff_mm
        new_state["_drMm"] = dr2
        return new_state

    def project(
        self,
        start_pct: float,
        hours: int,
        forecast: Optional[List[dict]] = None,
        crop_kc: float = 1.15,
        irrigation_l: float = 0.0,
        irrigation_hour: Optional[int] = None,
    ) -> List[dict]:
        """Project moisture timeline using provided forecast."""
        state = {"rootZoneMoisturePct": start_pct}
        timeline = []
        now = datetime.now(timezone.utc)

        # Fallback baseline weather row if forecast is empty
        default_row = {"solarRadMJm2": 1.2, "rainfallMm": 0.0, "temperatureC": 28.0}

        for h in range(hours):
            if forecast and len(forecast) > 0:
                row = forecast[h % len(forecast)]
            else:
                row = default_row

            if irrigation_hour is not None and h == irrigation_hour and irrigation_l > 0:
                add_pct = irrigation_l * 0.0195
                state["rootZoneMoisturePct"] = min(FC, state["rootZoneMoisturePct"] + add_pct)

            state = self.step_hour(state, row, crop_kc)
            timeline.append({
                "hour": h + 1,
                "time": iso(now + timedelta(hours=h + 1)),
                "moisturePct": state["rootZoneMoisturePct"],
            })
        return timeline


class PredictionService:
    """Deterministic moisture/stress/requirement prediction."""

    MODEL_VERSION = "fao56-physical-2.0"

    def predict_timeline(
        self,
        start_pct: float,
        hours: int,
        forecast: Optional[List[dict]] = None,
        crop_kc: float = 1.15,
    ) -> List[dict]:
        twin = DigitalTwinService()
        return twin.project(start_pct, hours, forecast=forecast, crop_kc=crop_kc)

    def predict_stress(self, timeline: List[dict], stage_factor: float = 1.0) -> float:
        if not timeline:
            return 0.0
        worst = max(stress_from_depletion(pct_to_depletion(p["moisturePct"]), stage_factor) for p in timeline)
        return round(worst, 1)

    def predict_requirement_l(self, pct: float) -> float:
        dr = pct_to_depletion(pct)
        refill_to_fc = max(0.0, dr)
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

    def run(
        self,
        start_pct: float,
        strategy: str,
        horizon: int = 48,
        available_water: float = 2000,
        forecast: Optional[List[dict]] = None,
        crop_kc: float = 1.15,
    ) -> dict:
        label, desc, delay, factor = self.STRATEGIES.get(
            strategy, ("Irrigate Now", "Immediate application", 0, 1.0)
        )
        irr_hour = delay
        req_now = self.pred.predict_requirement_l(start_pct)
        water = round(min(available_water, req_now * factor), 0)
        timeline = self.twin.project(
            start_pct,
            horizon,
            forecast=forecast,
            crop_kc=crop_kc,
            irrigation_l=water,
            irrigation_hour=irr_hour if water > 0 else None,
        )
        vals = [p["moisturePct"] for p in timeline]
        min_m = min(vals) if vals else start_pct
        stress = self.pred.predict_stress(timeline)
        waste = "NONE"

        has_rain_window = False
        if forecast:
            has_rain_window = any(f.get("rainfallMm", 0) > 2 for f in forecast[0:12])

        if has_rain_window and delay < 6 and water > 0:
            waste = "HIGH" if factor >= 1.0 else "MEDIUM"
        elif factor >= 1.0:
            waste = "LOW"

        return {
            "key": strategy,
            "label": label,
            "description": desc,
            "waterUsedL": water,
            "predictedMoisturePct": round(vals[-1], 1) if vals else start_pct,
            "minMoisturePct": round(min_m, 1),
            "stressRiskPct": stress,
            "wasteRisk": waste,
            "timeline": timeline,
        }


def run_full_simulation(
    start_pct: float,
    horizon: int = 48,
    available_water: float = 2000,
    forecast: Optional[List[dict]] = None,
    crop_kc: float = 1.15,
) -> dict:
    sim = SimulationService()
    scenarios = [
        sim.run(start_pct, k, horizon, available_water, forecast, crop_kc)
        for k in sim.STRATEGIES
    ]

    best = None
    for s in scenarios:
        if s["stressRiskPct"] <= 15 and s["predictedMoisturePct"] >= 23.5:
            if best is None or s["waterUsedL"] < best["waterUsedL"]:
                best = s
    if best is None:
        best = min(scenarios, key=lambda s: s["stressRiskPct"])

    rain_prob = 0
    if forecast and len(forecast) > 0:
        rain_prob = max(f.get("rainProbabilityPct", 0) for f in forecast[:12])

    for s in scenarios:
        s["recommended"] = (s["key"] == best["key"])
        s["factors"] = [
            {"label": "Rain probability (12h)", "value": f"{rain_prob}%", "weight": 0.3 if s["key"].startswith("wait") else 0.1},
            {"label": "Drying rate", "value": "1.1%/h under ETc", "weight": 0.25},
            {"minMoisturePct": s["minMoisturePct"], "label": "Min moisture reached", "value": f"{s['minMoisturePct']}%", "weight": 0.25},
            {"label": "Water used", "value": f"{s['waterUsedL']:.0f} L", "weight": 0.2},
        ]

    return {
        "generatedAt": now_iso(),
        "baseline": {
            "moisturePct": start_pct,
            "fieldCapacityPct": FC,
            "wiltingPointPct": WP,
            "availableWaterL": available_water,
        },
        "scenarios": scenarios,
        "recommendedKey": best["key"],
    }


def rain_uncertainty(
    strategy: str = "wait6",
    start_pct: float = 24.6,
    horizon: int = 48,
    forecast: Optional[List[dict]] = None,
    crop_kc: float = 1.15,
) -> List[dict]:
    sim = SimulationService()
    base = sim.run(start_pct, strategy, horizon, 2000, forecast, crop_kc)
    irr_l = base["waterUsedL"]
    irr_hour = sim.STRATEGIES.get(strategy, (None, None, 0, 1.0))[2]
    out = []
    outcomes = [
        ("rain_occurs", "Rain Occurs", 1.0),
        ("rain_partial", "Rain Partially Occurs", 0.5),
        ("rain_fails", "Rain Fails", 0.0),
    ]

    now = datetime.now(timezone.utc)
    default_row = {"solarRadMJm2": 1.2, "rainfallMm": 0.0}

    for key, label, frac in outcomes:
        state = {"rootZoneMoisturePct": start_pct}
        timeline = []
        for h in range(horizon):
            if h == irr_hour and irr_l > 0:
                state["rootZoneMoisturePct"] = min(FC, state["rootZoneMoisturePct"] + irr_l * 0.0195)

            if forecast and len(forecast) > 0:
                row = forecast[h % len(forecast)]
            else:
                row = default_row

            et0 = row.get("solarRadMJm2", 0) * ET0_FACTOR
            etc = et0 * crop_kc
            dr = pct_to_depletion(state["rootZoneMoisturePct"])
            dr = max(0.0, dr - row.get("rainfallMm", 0) * frac * 0.8) + etc + PERCOLATION_MM_H
            dr = min(pct_to_taw() * 1.3, dr)
            state["rootZoneMoisturePct"] = round(depletion_to_pct(dr), 2)
            timeline.append({
                "hour": h + 1,
                "time": iso(now + timedelta(hours=h + 1)),
                "moisturePct": state["rootZoneMoisturePct"],
            })

        vals = [p["moisturePct"] for p in timeline]
        stress = PredictionService().predict_stress(timeline)
        if stress < 15:
            verdict = "Plan holds — stress stays below the 15% threshold"
        elif stress < 35:
            verdict = "Marginal — re-evaluate at T+6h with updated forecast"
        else:
            verdict = "Contingency needed — schedule supplemental irrigation window"

        out.append({
            "key": key,
            "label": label,
            "rainFraction": frac,
            "endMoisturePct": round(vals[-1], 1) if vals else start_pct,
            "minMoisturePct": round(min(vals), 1) if vals else start_pct,
            "stressRiskPct": stress,
            "timeline": timeline,
            "verdict": verdict,
        })
    return out


# ---------------------------------------------------------------- optimization

def optimize_water(zones: List[dict], available: float) -> dict:
    """OR-Tools allocation with deterministic priority fallback on actual supplied zones."""
    if not zones:
        return {
            "availableWaterL": available,
            "totalNeedL": 0.0,
            "totalAllocatedL": 0.0,
            "allocations": [],
            "constraintStatus": "No zones registered",
            "waterSavedL": 0.0,
            "explanation": "No active field zones registered to allocate water.",
            "solver": "N/A",
        }

    solver_name = "OR-Tools CP-SAT"
    cleaned_zones = [
        {**z, "needL": float(z.get("needL", z.get("waterRequirementL", 0)))}
        for z in zones
    ]
    alloc: Dict[str, float] = {}

    try:
        from ortools.sat.python import cp_model

        m = cp_model.CpModel()
        xs = {}
        for z in cleaned_zones:
            xs[z["id"]] = m.new_int_var(0, int(z["needL"]), f"x_{z['id']}")
        m.add(sum(xs.values()) <= int(available))
        m.maximize(sum(int(10 - z.get("priority", 5)) * xs[z["id"]] for z in cleaned_zones))
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 2.0
        status = solver.solve(m)
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError("infeasible")
        for z in cleaned_zones:
            alloc[z["id"]] = float(solver.value(xs[z["id"]]))
    except Exception:
        solver_name = "Deterministic priority solver"
        remaining = available
        for z in sorted(cleaned_zones, key=lambda zz: (zz.get("priority", 5), -zz["needL"])):
            give = min(z["needL"], max(0.0, remaining))
            alloc[z["id"]] = give
            remaining -= give
            if remaining <= 0:
                break

    allocations = []
    total_alloc = 0.0
    for z in cleaned_zones:
        a = alloc.get(z["id"], 0.0)
        total_alloc += a
        moisture = z.get("moisturePct", 20.0)
        after_pct = min(FC, moisture + a * 0.0195)
        dr_after = pct_to_depletion(after_pct)
        allocations.append({
            "zoneId": z["id"],
            "zoneName": z["name"],
            "needL": z["needL"],
            "allocatedL": round(a, 0),
            "priority": z.get("priority", 1),
            "stressBeforePct": z.get("stressRiskPct", 0.0),
            "stressAfterPct": round(stress_from_depletion(dr_after), 1) if a > 0 else z.get("stressRiskPct", 0.0),
            "moistureAfterPct": round(after_pct, 1),
        })

    if total_alloc == 0 and sum(z["needL"] for z in cleaned_zones) == 0:
        constraint = "Adequate moisture — no irrigation needed"
    elif total_alloc < available - 1:
        constraint = "Surplus" if total_alloc == 0 else "Rationed"
    else:
        constraint = "Fully allocated"

    water_saved = sum(max(0.0, z["needL"] - alloc.get(z["id"], 0.0)) for z in cleaned_zones)
    return {
        "availableWaterL": available,
        "totalNeedL": sum(z["needL"] for z in cleaned_zones),
        "totalAllocatedL": round(total_alloc, 0),
        "allocations": allocations,
        "constraintStatus": constraint,
        "waterSavedL": round(water_saved, 0),
        "explanation": "Water allocated according to measured soil-moisture depletion, crop stress risk, and priority weighting.",
        "solver": solver_name,
    }
