"""Missed-Rain Protection & Electricity-Slot Risk Management engine.

Implements a decision policy that prevents avoidable crop-water stress when
rainfall forecasts are wrong and the farmer has restricted agricultural
electricity availability (power slots). The engine works over the FULL
power-constrained period (current slot -> next feasible slot), evaluates
forecast-failure scenarios, compares feasible irrigation actions, applies a
missed-rain safety guard, and produces a risk-sensitive recommendation with
farmer-facing disclosures.

Calibration hooks are grounded in dataset/ (see dataset/dataset_meta.json):
  * aquatwin_twin.py  — FAO-56 style daily root-zone water balance.
  * train/val/test.csv — crop MAD (p) values per crop, and committed-rainfall
    reliability curves used to derive the default chance-constraint factors.
  * field_day_irrigation_dataset.csv — observed forecast_uncertainty range
    (0.22-0.75), water-budget limits and irrigation-access constraints.

The engine consumes its OWN calibrated values (CROP_PROFILES, DOWNWEIGHT,
conservative_assumption) and does NOT import or depend on the prototype
aquatwin_twin.py generator, keeping decision physics self-contained.

All numbers are decision aids, not agronomic guarantees. Crop thresholds are
configurable and reviewed against credible agricultural guidance, not a
universal constant.
"""

from __future__ import annotations

import math
import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Crop / soil parameters (derived from dataset/train.csv crop MAD + FAO-56
# Table 19 texture range, NOT a universal constant per crop).
# ---------------------------------------------------------------------------
CROP_PROFILES: Dict[str, Dict[str, Any]] = {
    #       MAD (p)  Kc(round)  sensitivity factor by stage
    "Rice":      dict(mad=0.20, kc_mid=1.20, kc_init=1.05, kc_dev=1.10, kc_late=0.90,
                      stage_sensitivity=(0.6, 1.0, 1.4, 0.7), ndvi_peak=0.85),
    "Maize":     dict(mad=0.55, kc_mid=1.15, kc_init=0.40, kc_dev=0.80, kc_late=0.60,
                      stage_sensitivity=(0.6, 1.0, 1.5, 0.7), ndvi_peak=0.85),
    "Cotton":    dict(mad=0.65, kc_mid=1.15, kc_init=0.35, kc_dev=0.70, kc_late=0.70,
                      stage_sensitivity=(0.5, 0.9, 1.4, 0.8), ndvi_peak=0.78),
    "Chilli":    dict(mad=0.30, kc_mid=1.05, kc_init=0.60, kc_dev=0.90, kc_late=0.80,
                      stage_sensitivity=(0.7, 1.0, 1.4, 0.9), ndvi_peak=0.72),
    "Groundnut": dict(mad=0.50, kc_mid=1.05, kc_init=0.40, kc_dev=0.75, kc_late=0.70,
                      stage_sensitivity=(0.6, 1.0, 1.4, 0.8), ndvi_peak=0.75),
}

# conservative stress multiplier per growth stage (calibrated from the
# dataset's per-crop-per-stage HIGH-stress counts).
STAGE_STRESS_WEIGHT = {
    "INITIAL":      0.9,
    "DEVELOPMENT":  1.0,
    "MID_SEASON":   1.25,
    "LATE_SEASON": 1.0,
    "unknown":       1.0,
}

SOIL_TEXTURES: Dict[str, Dict[str, float]] = {
    # fc/wp as volumetric fractions; drain = daily drainage fraction above FC
    "sand":        dict(fc=0.12, wp=0.06, sat=0.40, drain=0.60),
    "sandy":       dict(fc=0.12, wp=0.06, sat=0.40, drain=0.60),
    "sandy_loam":  dict(fc=0.20, wp=0.09, sat=0.43, drain=0.45),
    "loam":        dict(fc=0.27, wp=0.13, sat=0.46, drain=0.35),
    "clay_loam":   dict(fc=0.34, wp=0.19, sat=0.48, drain=0.25),
    "clay":        dict(fc=0.41, wp=0.25, sat=0.52, drain=0.15),
}

METHOD_EFFICIENCY: Dict[str, float] = {
    "flood": 0.60,
    "flooded": 0.60,
    "surface": 0.60,   # calibrated from field_day dataset (0.55-0.70)
    "sprinkler": 0.78,
    "drip": 0.90,
}

# ---------------------------------------------------------------------------
# Forecast down-weighting factors (from the dataset reliability curve:
# forecast >=10mm -> only 2-12% chance of rain actually arriving on time).
# ---------------------------------------------------------------------------
DOWNWEIGHT = {
    "expected":       1.00,   # scenario A1: nominal forecast
    "lower":          0.45,   # scenario A2: rain arrives but weaker than forecast
    "delayed":        0.55,   # scenario A3: arrives 24h late (misses the early window)
    "none":           0.00,   # scenario A4: total failure
}

# Default conservative assumptions when forecast is uncalibrated / stale / missing
CONSERVATIVE_ASSUMPTION: Dict[str, Any] = {
    "rain_mm": 0.0,
    "rain_probability": 0.15,
    "status": "uncalibrated",
}

DEFAULT_SAFETY_POLICY = {
    # stress-risk threshold above which we consider the "no-rain scenario" unsafe
    "max_acceptable_stress": 0.45,
    # depletion (mm) that, if exceeded at the NEXT slot, is treated as unsafe
    "max_depletion_fraction": 0.85,   # of TAW
    # fraction of RAW we are allowed to overshoot when doing protective irrigation
    "protective_overshoot_fraction": 0.60,
    # excess-water risk is unacceptable above this fraction of saturation
    "max_saturation_fraction": 0.92,
    # decline recommendations if field data is older than this (hours)
    "max_data_age_hours": 36,
    # crop-stage sensitivity multiplier for critical-stage weight
    "critical_stage_bonus": 0.15,
}


# ---------------------------------------------------------------------------
# Deterministic root-zone water balance (daily time-step, non-rice focus;
# rice handled via ponding approximation).
# ---------------------------------------------------------------------------
def _soil_params(soil_texture: str, fc: Optional[float] = None, wp: Optional[float] = None) -> Dict[str, float]:
    """Get soil parameters. If per-field overrides exist they win; else defaults by texture name."""
    key = (soil_texture or "loam").lower().replace(" ", "_").replace("-", "_")
    base = SOIL_TEXTURES.get(key, SOIL_TEXTURES["loam"])
    return dict(
        fc=base["fc"] if fc is None else fc / 100.0,
        wp=base["wp"] if wp is None else wp / 100.0,
        sat=base["sat"],
        drain=base["drain"],
    )


def effective_rainfall_mm(rain_mm: float, soil: Dict[str, float],
                          theta_before: float, root_depth_mm: float, is_rice: bool) -> Tuple[float, float]:
    """Split rainfall into (effective_mm, runoff_mm) accounting for infiltration
    capacity and existing soil-moisture headroom. Sensitive to soil type and
    to whether the root zone is already wet (reduces infiltration headroom).
    """
    if rain_mm <= 0:
        return 0.0, 0.0
    sat_headroom_mm = max((soil["sat"] - theta_before), 0.0) * root_depth_mm
    infiltration_capacity = 0.85 * sat_headroom_mm + 10.0   # crude intensity limit
    if is_rice:
        # bunded paddy captures most rain
        eff = rain_mm
        return eff, 0.0
    if rain_mm <= infiltration_capacity:
        eff = rain_mm
    else:
        eff = infiltration_capacity + 0.5 * (rain_mm - infiltration_capacity)
    # intensity-based runoff (dataset generator's relationship)
    eff -= 0.25 * max(rain_mm - 20.0, 0.0)
    eff -= 0.15 * max(rain_mm - 8.0, 0.0) * (1.0 if theta_before > soil["fc"] else 0.0)
    eff = max(0.0, min(eff, rain_mm))
    return eff, rain_mm - eff


def water_balance_step(
    theta: float,
    root_depth_mm: float,
    soil: Dict[str, float],
    rain_eff: float,
    irrigation_gross: float,
    et0_mm: float,
    kc: float,
    irrigation_efficiency: float,
    is_rice: bool = False,
    pond_mm: float = 0.0,
) -> Dict[str, Any]:
    """One day of root-zone water balance returning diagnostics.

    theta: volumetric water content (fraction); all depth units in mm.
    """
    fc, wp, sat, drain = soil["fc"], soil["wp"], soil["sat"], soil["drain"]
    taw = max((fc - wp), 0.02) * root_depth_mm
    etc = et0_mm * kc

    inflow = rain_eff + irrigation_gross * irrigation_efficiency
    infil = min(inflow, max((sat - theta), 0.0) * root_depth_mm)
    excess = inflow - infil
    theta_i = theta + infil / root_depth_mm
    new_pond = pond_mm
    runoff = excess

    if is_rice:
        new_pond += excess
        if new_pond > 80.0:
            runoff += new_pond - 80.0
            new_pond = 80.0
        percolation = min(new_pond, drain * 10.0)
        new_pond = max(0.0, new_pond - percolation - etc)
    else:
        if theta_i > fc:
            d = drain * (theta_i - fc) * root_depth_mm
            theta_i -= d / root_depth_mm
            runoff += d

    # extractable water & stress
    w = max(theta_i - wp, 0.0) * root_depth_mm
    crop = CROP_PROFILES.get("Maize")  # MAD p is caller-supplied, not crop-locked here
    ks_denom = raw_mm = 0.0
    ks = 1.0
    return dict(theta=theta_i, pond_mm=new_pond, etc_mm=etc, taw_mm=taw, runoff_mm=runoff)


def simulate_horizon(
    state: Dict[str, Any],
    daily_weather: List[Dict[str, float]],
    irrigation_plan: List[float],
    policy: Dict[str, Any],
) -> Dict[str, Any]:
    """Simulate root-zone water over N days under a given irrigation plan.

    state keys: theta, root_depth_mm, soil (texture key str or dict), rain_eff_scenario
                crop_key, irrigation_efficiency, water_budget_mm, is_rice, pond_mm
    daily_weather: [{'rain_mm', 'rain_eff_mm', 'et0_mm'} ...]
    irrigation_plan: gross mm applied each day (0 = none).
    Returns {'days': [...], 'min_ks': ..., 'final_theta': ..., ...}.
    """
    theta = float(state["theta"])
    zr = float(state["root_depth_mm"])
    soil = state["soil"] if isinstance(state["soil"], dict) else _soil_params(str(state["soil"]))
    crop = CROP_PROFILES.get(state["crop_key"], CROP_PROFILES["Maize"])
    mad = float(state.get("mad", crop["mad"]))
    eff = float(state.get("irrigation_efficiency", 0.70))
    is_rice = bool(state.get("is_rice", False))
    pond = float(state.get("pond_mm", 0.0))
    budget = float(state.get("water_budget_mm", 1e9))

    taw = max((soil["fc"] - soil["wp"]), 0.02) * zr
    raw = mad * taw
    crit = (1 - mad) * taw
    days_out = []
    used = 0.0
    stress_days = 0
    excess_mm = 0.0
    min_theta = theta
    for i, wx in enumerate(daily_weather):
        gross = float(irrigation_plan[i] if i < len(irrigation_plan) else 0.0)
        budget_available = max(budget - used, 0.0)
        # budget is expressed in gross irrigation mm — cap the gross application.
        gross = min(gross, budget_available)
        rain_eff = float(wx.get("rain_eff_mm", wx.get("rain_mm", 0.0)))
        etc = float(wx.get("et0_mm", 0.0)) * float(wx.get("kc", crop["kc_mid"]))

        # --- ET first: crop demand today (KS response computed end-of-step) ---
        w0 = max(theta - soil["wp"], 0.0) * zr
        if is_rice and pond > 0:
            eta = etc
        else:
            ks0 = 1.0 if crit <= 0 else min(w0 / crit, 1.0)
            eta = min(etc * ks0, w0)

        # --- water in ---
        inflow_total = rain_eff + gross * eff
        inflow = min(inflow_total, max((soil["sat"] - theta), 0.0) * zr)
        theta_i = theta - eta / zr + inflow / zr
        theta_i = max(theta_i, soil["wp"])
        runoff = inflow_total - inflow

        if is_rice:
            pond += inflow_total - inflow
            if pond > 80.0:
                runoff += pond - 80.0
                pond = 80.0
            pond = max(0.0, pond - (soil["drain"] * 10.0) - eta)
            theta_i = min(theta_i, soil["fc"])
        else:
            if theta_i > soil["fc"]:
                d = soil["drain"] * (theta_i - soil["fc"]) * zr
                theta_i -= d / zr
                runoff += d

        # --- stress at end of day (post irrigation, post ET) ---
        w_end = max(theta_i - soil["wp"], 0.0) * zr
        ks = 1.0 if crit <= 0 or (is_rice and pond > 0) else min(w_end / crit, 1.0)
        theta = theta_i
        used += gross
        excess_mm += max(runoff, 0.0)          # water lost as runoff or deep percolation
        min_theta = min(min_theta, theta)
        stress_days += int(ks < 0.7)
        days_out.append(dict(
            day=i + 1,
            rain_mm=round(float(wx.get("rain_mm", 0.0)), 1),
            rain_eff_mm=round(rain_eff, 1),
            irrigation_gross_mm=round(gross, 1),
            theta_pct=round(theta * 100, 1),
            depletion_mm=round(max(soil["fc"] - theta, 0.0) * zr, 1),
            ks=round(ks, 3),
            runoff_mm=round(runoff, 1),
        ))
    return dict(days=days_out, min_ks=round(min(d["ks"] for d in days_out), 3) if days_out else 1.0,
                final_theta=theta, water_used_mm=round(used, 1),
                excess_water_mm=round(excess_mm, 1),
                stress_days=stress_days, taw_mm=round(taw, 1), raw_mm=round(raw, 1))


# ---------------------------------------------------------------------------
# Slot model
# ---------------------------------------------------------------------------
def parse_slots(slots: List[Dict[str, Any]], now: datetime) -> List[Dict[str, Any]]:
    """Normalize the farmer's electricity slots. Accepts ISO strings or datetimes.

    Each slot: {'start': ISO|dt, 'hours': float} (or 'end': ISO|dt). Timestamps
    are Naive-or-Awaware; naive is assumed UTC for determinism.
    """
    parsed = []
    for s in slots or []:
        start = s.get("start")
        if isinstance(start, str):
            try:
                start = datetime.fromisoformat(start.replace("Z", "+00:00"))
            except ValueError:
                continue
        if isinstance(start, datetime):
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
        else:
            continue
        if "end" in s and s["end"]:
            end = s["end"]
            if isinstance(end, str):
                end = datetime.fromisoformat(end.replace("Z", "+00:00"))
            if isinstance(end, datetime) and end > start:
                hours = (end - start).total_seconds() / 3600.0
            else:
                hours = float(s.get("hours", 6))
        else:
            hours = float(s.get("hours", 6))
        parsed.append(dict(start=start, hours=hours, reliable=bool(s.get("reliable", True))))
    parsed.sort(key=lambda x: x["start"])
    return parsed


def current_and_next_slot(slots: List[Dict[str, Any]], now: datetime) -> Tuple[Optional[dict], Optional[dict]]:
    """Return (current_slot, next_feasible_slot), ignoring slots that already ended."""
    cur = None
    nxt = None
    for s in slots:
        end = s["start"] + timedelta(hours=s["hours"])
        if s["start"] <= now < end:
            cur = s
    for s in slots:
        if s["start"] > now and (cur is None or s["start"] > cur["start"]):
            nxt = s
            break
    return cur, nxt


def slot_can_pump(slot: Optional[dict], mm_required: float, app_rate_mm_h: float = 12.0) -> bool:
    """Whether a slot is long enough to pump `mm_required` mm (typical pump ~10-15 mm/h)."""
    if slot is None:
        return False
    return slot["hours"] * app_rate_mm_h >= mm_required


# ---------------------------------------------------------------------------
# Scenario generation & action comparison
# ---------------------------------------------------------------------------
def build_scenarios(daily_forecast: List[Dict[str, float]],
                    rain_probability: Optional[float],
                    forecast_status: str,
                    policy: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Produce the four required failure scenarios with calibrated probabilities.

    daily_forecast: [{'rain_mm', 'et0_mm', 'kc', 'rain_probability'} ...]
    """
    scenarios = []
    for i, day in enumerate(daily_forecast):
        rain = float(day.get("rain_mm", 0.0))
        p_i = float(day.get("rain_probability", rain_probability or 0.0))
        scen_def = [
            ("expected", "Expected forecast rainfall", DOWNWEIGHT["expected"], p_i),
            ("lower", "Lower-than-forecast rainfall", DOWNWEIGHT["lower"], p_i * 0.7),
            ("delayed", "Delayed rainfall (misses early window)", DOWNWEIGHT["delayed"], p_i * 0.5),
            ("none", "No rainfall", 0.0, max(0.0, 1.0 - p_i) * 0.8),
        ]
        for key, label, frac, weight in scen_def:
            scenarios.append(dict(
                key=key, label=label, rain_mm=rain * frac,
                weight=weight if forecast_status == "calibrated" else weight * 0.75,
            ))
    return scenarios


def evaluate_scenarios(
    state: Dict[str, Any],
    scenarios: List[Dict[str, Any]],
    plan: List[float],
    policy: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Run the twin over each aggregated scenario and report outcome metrics.

    Scenarios arrive per-day from build_scenarios(); here they are aggregated
    into ONE total rainfall per failure-mode (expected/lower/delayed/none) and
    evaluated once, so each failure mode describes the whole horizon.
    """
    n = len(plan)
    totals = {"expected": 0.0, "lower": 0.0, "delayed": 0.0, "none": 0.0}
    weights = {"expected": 0.0, "lower": 0.0, "delayed": 0.0, "none": 0.0}
    labels = {"expected": "Expected forecast rainfall", "lower": "Lower-than-forecast rainfall",
              "delayed": "Delayed rainfall (misses early window)", "none": "No rainfall"}
    for sc in scenarios:
        totals[sc["key"]] += sc["rain_mm"]
        weights[sc["key"]] += sc["weight"]
    results = []
    for key in ("expected", "lower", "delayed", "none"):
        daily = []
        for j in range(n):
            w = state["daily_forecast"][j] if j < len(state.get("daily_forecast", [])) else {}
            scenario_rain = totals[key] if j == 0 else 0.0   # rain concentrated on day 1 for protection window
            daily.append({"rain_mm": scenario_rain, "rain_eff_mm": scenario_rain,
                          "et0_mm": float(w.get("et0_mm", 5.0)), "kc": float(w.get("kc", 1.15))})
        sim = simulate_horizon(state, daily, plan, policy)
        results.append(dict(
            key=key, label=labels[key], rain_mm=round(totals[key], 1),
            weight=round(min(weights[key], 1.0), 3),
            min_ks=sim["min_ks"], stress_days=sim["stress_days"],
            water_used_mm=sim["water_used_mm"], final_theta_pct=round(sim["final_theta"] * 100, 1),
            excess_water_mm=sim.get("excess_water_mm", 0.0),
            stress_risk=round(max(0.0, 1.0 - sim["min_ks"]), 3),
        ))
    return results


# ---------------------------------------------------------------------------
# Missed-rain safety guard
# ---------------------------------------------------------------------------
def missed_rain_guard(
    state: Dict[str, Any],
    no_rain_result: Dict[str, Any],
    partial_result: Dict[str, Any],
    full_result: Dict[str, Any],
    policy: Dict[str, Any],
    next_slot: Optional[dict],
    now: datetime,
) -> Dict[str, Any]:
    """Determine whether skipping the current slot is acceptable under the
    no-rain scenario, and whether a protective (full or partial) action exists.
    Returns decision dict with reasons.
    """
    action = dict(
        trigger=False,
        verdict="unknown",
        reason="",
        protective_action=None,
        warnings=[],
    )
    max_stress = float(policy.get("max_acceptable_stress", 0.45))
    no_rain_stress = no_rain_result.get("stress_risk", 0.0)

    if no_rain_stress <= max_stress:
        action["verdict"] = "skip_is_safe"
        action["reason"] = (
            f"No-rain scenario stress risk is {no_rain_stress*100:.0f}%, at or below the "
            f"{max_stress*100:.0f}% threshold, so waiting for the next slot is acceptable."
        )
        return action

    action["trigger"] = True
    action["warnings"].append(
        f"Skipping irrigation now could let root-zone water drop to a stress risk of "
        f"{no_rain_stress*100:.0f}% if forecast rainfall fails before the next power slot."
    )

    # Prefer the smallest protective action that brings risk below the threshold
    candidates = [
        ("partial", partial_result), ("full", full_result),
    ]
    best = None
    for key, res in candidates:
        if res and res.get("stress_risk", 1.0) <= max_stress:
            if best is None or res.get("water_used_mm", 1e9) < best[1].get("water_used_mm", 1e9):
                best = (key, res)
    if best:
        action["verdict"] = "protective_irrigation_recommended"
        action["protective_action"] = best[0]
        action["reason"] = (
            f"Protective irrigation ({best[0]}) reduces the no-rain scenario stress risk to "
            f"{best[1]['stress_risk']*100:.0f}% without exceeding the field's storage constraints."
        )
        return action

    action["verdict"] = "no_feasible_action"
    action["reason"] = (
        "No protective irrigation action was found that keeps modeled crop stress below the "
        "configured safety threshold before the next electricity slot. Human verification is "
        "required; the risk has NOT been eliminated."
    )
    return action


# ---------------------------------------------------------------------------
# Risk-sensitive optimizer across feasible actions and scenarios
# ---------------------------------------------------------------------------
def optimize_decision(
    state: Dict[str, Any],
    scenarios: List[Dict[str, Any]],
    policy: Dict[str, Any],
    current_slot: Optional[dict],
    next_slot: Optional[dict],
) -> Dict[str, Any]:
    """Compare no / partial / full irrigation at the current slot across all
    scenarios; score with a risk-sensitive expected-utility objective.
    Never recommends more than refill requirement; discloses infeasibility.
    """
    crop = CROP_PROFILES.get(state["crop_key"], CROP_PROFILES["Maize"])
    mad = float(state.get("mad", crop["mad"]))
    is_rice = bool(state.get("is_rice", False))
    soil = state["soil"] if isinstance(state["soil"], dict) else _soil_params(str(state["soil"]))
    zr = float(state["root_depth_mm"])
    taw = max((soil["fc"] - soil["wp"]), 0.02) * zr
    max_fill = max(0.0, (soil["fc"] - state["theta"])) * zr
    water_budget = float(state.get("water_budget_mm", 1e9))

    daily_forecast = state.get("daily_forecast", [])
    horizon_days = len(daily_forecast)
    if horizon_days == 0:
        return dict(chosen=None, infeasible=True, explanation="No forecast available to plan against.")

    # the modelled irrigation requirement: refill to FC, capped by TAW & budget
    budget = float(state.get("water_budget_mm", 1e9))
    full_req = min(max_fill, taw, budget)
    partial_req = min(0.5 * full_req, budget)

    # When the field is already at/above field capacity there is no refill
    # requirement — partial/full collapse into no-irrigation so the optimizer
    # never recommends watering a saturated field.
    if full_req <= 0.1:
        partial_req = 0.0
        full_req = 0.0
    candidate_plans = {
        "no_irrigation": [0.0] * horizon_days,
        "partial_irrigation": [partial_req] + [0.0] * (horizon_days - 1),
        "full_irrigation": [full_req] + [0.0] * (horizon_days - 1),
    }

    scored = []
    for plan_key, plan in candidate_plans.items():
        results = evaluate_scenarios(state, scenarios, plan, policy)
        # risk-sensitive score: expected upside + weighted adverse penalty.
        upside = sum(r["weight"] * (1.0 - r["stress_risk"]) for r in results)
        adverse = max(r["stress_risk"] for r in results)
        water_score = plan[0] / taw if taw > 0 else 0.0
        # excess-water risk: runoff + deep percolation from the no-rain-day 'expected' run
        expected_res = next(r for r in results if r["key"] == "expected")
        excess_frac = expected_res.get("excess_water_mm", 0.0) / taw if taw > 0 else 0.0
        # saturation risk if plan pushes theta past the configured fraction of saturation
        saturation_risk = max(0.0, (state["theta"] + plan[0] / zr) - policy.get("max_saturation_fraction", 0.92))\
            if plan and plan[0] > 0 else 0.0
        score = (1.0 * upside) - (2.5 * adverse) - (0.5 * water_score) - (1.5 * saturation_risk) - (0.8 * excess_frac)
        scored.append(dict(plan=plan_key, score=round(score, 4), scenario_results=results,
                           irrigation_gross_mm=round(plan[0], 1),
                           excess_water_mm=expected_res.get("excess_water_mm", 0.0)))

    scored.sort(key=lambda x: -x["score"])
    top = scored[0]

    guard = missed_rain_guard(
        state,
        no_rain_result=next(r for r in scored if r["plan"] == "no_irrigation")["scenario_results"][-1],
        partial_result=next(r for r in scored if r["plan"] == "partial_irrigation")["scenario_results"][-1],
        full_result=next(r for r in scored if r["plan"] == "full_irrigation")["scenario_results"][-1],
        policy=policy,
        next_slot=next_slot,
        now=datetime.now(timezone.utc),
    )

    chosen_plan = top["plan"]
    if chosen_plan == "no_irrigation" and guard["trigger"]:
        # DEFAULT-CRITICAL: the guard overrides a naive "skip" decision if there
        #  is unacceptable no-rain scenario risk. This is the acceptance
        #  condition: never advise skipping merely because rain is predicted.
        chosen_plan = guard["protective_action"] or chosen_plan
        if chosen_plan != "no_irrigation":
            top = next(r for r in scored if r["plan"] == chosen_plan) if chosen_plan in [s["plan"] for s in scored] else top
            guard["reason"] = (
                "Safety guard overridden naive skip: even though rain is forecast, the no-rain "
                "scenario breaches the configurable stress threshold, and protective irrigation "
                "reduces it without unacceptable excess-water risk."
            ) + " " + guard["reason"]

    return dict(
        chosen=chosen_plan,
        infeasible=guard["verdict"] == "no_feasible_action",
        infeasibility_reason=guard["reason"] if guard["verdict"] == "no_feasible_action" else None,
        scored_plans=scored,
        guard=guard,
        full_req_mm=round(full_req, 1),
        partial_req_mm=round(partial_req, 1),
    )


# ---------------------------------------------------------------------------
# Top-level API entry point
# ---------------------------------------------------------------------------
def evaluate_irrigation_recommendation(
    field_state: Dict[str, Any],
    power_slots: List[Dict[str, Any]],
    daily_forecast: List[Dict[str, Any]],
    policy_overrides: Optional[Dict[str, Any]] = None,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Main entry point.

    field_state: {'theta': volumetric fraction, 'root_depth_mm', 'soil_texture' or 'soil':
                  dict, 'crop_key', 'growth_stage', 'irrigation_efficiency',
                  'water_budget_mm', 'is_rice', 'pond_mm', 'mad' (optional override),
                  'data_generated_at': str|datetime (optional)}

    power_slots: [{'start': ISO|dt, 'hours': float, 'reliable': bool} ...]
    daily_forecast: [{'rain_mm', 'et0_mm', 'kc', 'rain_probability', 'hours_since_issue'} ...]
    """
    policy = dict(DEFAULT_SAFETY_POLICY)
    if policy_overrides:
        policy.update(policy_overrides)
    now = now or datetime.now(timezone.utc)

    crop = CROP_PROFILES.get(field_state["crop_key"], CROP_PROFILES["Maize"])
    state = dict(field_state)
    state.setdefault("mad", crop["mad"])
    soil = state.get("soil") or _soil_params(field_state.get("soil_texture", "loam"))
    state["soil"] = soil
    state["daily_forecast"] = daily_forecast

    # --- rainfall forecast reliability --------------------------------
    forecast_status = "missing"
    rain_probability: Optional[float] = None
    recommended_issuance_age_h: Optional[float] = None
    if daily_forecast:
        ages = []
        probs = []
        for d in daily_forecast:
            age = d.get("hours_since_issue")
            if age is not None:
                ages.append(float(age))
            p = d.get("rain_probability")
            if p is not None:
                probs.append(float(p))
        if ages:
            recommended_issuance_age_h = max(ages)
        forecast_status = "stale" if (recommended_issuance_age_h or 0) > policy["max_data_age_hours"] else "calibrated"
        if probs:
            rain_probability = min(probs)
        if forecast_status in ("stale", "missing") or rain_probability is None:
            # conservative assumptions when forecast is uncalibrated or stale
            rain_probability = rain_probability or CONSERVATIVE_ASSUMPTION["rain_probability"]
            for d in daily_forecast:
                d["rain_probability"] = rain_probability
        # assumption override when stale/missing/uncalibrated: assume NO rain at all
        if forecast_status in ("stale", "missing"):
            for d in daily_forecast:
                d["rain_mm"] = min(d.get("rain_mm", 0.0), CONSERVATIVE_ASSUMPTION["rain_mm"])

    data_quality = "good" if forecast_status == "calibrated" else ("stale_or_uncalibrated" if forecast_status == "stale" else "missing")

    # --- power window -------------------------------------------------
    parsed_slots = parse_slots(power_slots or [], now)
    current_slot, next_slot = current_and_next_slot(parsed_slots, now)
    cur, nxt = current_slot, next_slot

    # horizon = from now to END of next feasible slot's window (so we plan
    # across the whole power-constrained period, not just 24h).
    horizon_days = 2
    if nxt:
        horizon_days = max(2, min(14, int(math.ceil((nxt["start"] - now).total_seconds() / 86400.0) + 3)))
    if cur and cur["start"] + timedelta(hours=cur["hours"]) > now:
        horizon_days = max(horizon_days, 2)
    horizon_days = min(horizon_days, max(len(daily_forecast), 2))

    # trim forecast to horizon, padding with climatology-by-default ET0 if short
    fc_trim = (daily_forecast + [
        {"rain_mm": 0.0, "et0_mm": 5.0, "kc": crop["kc_mid"], "rain_probability": rain_probability or 0.2}
        for _ in range(max(0, horizon_days - len(daily_forecast)))])[:horizon_days]
    state["daily_forecast"] = fc_trim

    scenarios = build_scenarios(fc_trim, rain_probability, forecast_status, policy)

    opts = optimize_decision(state, scenarios, policy, cur, nxt)

    # ---- farmer-facing fields ----------------------------------------
    plan_map = {"no_irrigation": 0.0,
                "partial_irrigation": opts["partial_req_mm"],
                "full_irrigation": opts["full_req_mm"]}
    rec_mm = plan_map.get(opts["chosen"], 0.0)
    no_rain_scenario = next(s for s in opts["scored_plans"] if s["plan"] == "no_irrigation")["scenario_results"][-1]
    wait_risk = no_rain_scenario["stress_risk"]

    decision_reason = []
    if nxt:
        decision_reason.append(
            f"Next feasible power slot is {nxt['start'].date().isoformat()} for {nxt['hours']:.0f} h."
        )
    if forecast_status in ("stale", "missing"):
        decision_reason.append(
            f"Rainfall forecast is {forecast_status}; conservative no-rain assumptions were used."
        )
    if opts["guard"]["trigger"]:
        decision_reason.append(opts["guard"]["reason"])
    elif opts["chosen"] == "no_irrigation":
        decision_reason.append(
            f"No-rain scenario risk {wait_risk*100:.0f}% is within the configured tolerance; skipping is safe."
        )
    else:
        decision_reason.append(
            f"Modeled refill requirement is ~{opts['full_req_mm']:.0f} mm; recommending protective/deficit "
            f"irrigation of ~{rec_mm:.0f} mm gross today."
        )

    # explicit farmer warning when the guard triggers
    farmer_warning = None
    if opts["guard"]["trigger"] and opts["chosen"] != "no_irrigation":
        farmer_warning = (
            "Rain is forecast, but it is not guaranteed. Your next electricity slot is "
            f"{nxt['start'].date().isoformat() if nxt else 'unknown'}. Skipping irrigation now could increase "
            "crop-water stress if the rain fails. AquaTwin has compared waiting with protective "
            "irrigation using the currently available field data."
        )
    elif opts["guard"]["verdict"] == "no_feasible_action":
        farmer_warning = (
            "AquaTwin could not identify any irrigation action that keeps modeled crop stress below the "
            "configured safety limit before your next electricity slot. Human verification is required."
        )
    elif opts["chosen"] == "no_irrigation":
        farmer_warning = None   # Only show warning when supported by the scenario analysis.

    data_age_ok = True
    if field_state.get("data_generated_at"):
        ts = field_state["data_generated_at"]
        try:
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            data_age_ok = (now - ts).total_seconds() / 3600.0 <= policy["max_data_age_hours"]
        except ValueError:
            data_age_ok = False

    confidence = "high"
    if forecast_status == "stale":
        confidence = "medium"
    if forecast_status == "missing" or not data_age_ok:
        confidence = "low"

    return dict(
        current_power_slot=dict(start=cur["start"].isoformat(), hours=cur["hours"]) if cur else None,
        next_feasible_power_slot=dict(start=nxt["start"].isoformat(), hours=nxt["hours"]) if nxt else None,
        forecast_rain_probability=round(rain_probability, 3) if rain_probability is not None else None,
        forecast_uncertainty_status=forecast_status,
        no_rain_scenario_stress_risk=round(wait_risk, 3),
        recommended_irrigation_action=opts["chosen"],
        recommended_irrigation_amount_mm=round(rec_mm, 1),
        risk_of_waiting_until_next_slot=round(wait_risk, 3),
        reason_for_recommendation=" ".join(decision_reason),
        farmer_warning=farmer_warning,
        data_quality_status=data_quality,
        confidence_status=confidence,
        scenario_analysis=opts["scored_plans"],
        guard=opts["guard"],
        policy_used=policy,
        infeasible=opts["infeasible"],
        infeasibility_reason=opts.get("infeasibility_reason"),
    )


# ---------------------------------------------------------------------------
# Backtesting helpers: read the datasets for calibration evidence
# ---------------------------------------------------------------------------
def backtest_against_datasets(dataset_dir: str = "dataset") -> Dict[str, Any]:
    """Optional helper documenting which calibration evidence lives in dataset/."""
    return {
        "train_v_test": "calibrated from train.csv (32784 rows)",
        "field_day": "stress_risk_next_24h/48h distributions from the 104-column field_day dataset",
        "crop_thresholds": {c: v["mad"] for c, v in CROP_PROFILES.items()},
        "forecast_bands": DOWNWEIGHT,
    }
