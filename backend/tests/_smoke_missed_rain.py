"""Manual smoke-test driver for the missed-rain safety engine (not unittest)."""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timedelta, timezone
from app.services.missed_rain_safety import evaluate_irrigation_recommendation

NOW_DT = datetime(2026, 10, 10, 9, 0, 0, tzinfo=timezone.utc)

DRY = lambda: [{"rain_mm": 0.0, "et0_mm": 6.0, "kc": 1.15, "rain_probability": 0.05} for _ in range(6)]
RAINY = lambda p=0.85: [{"rain_mm": 25.0, "et0_mm": 5.0, "kc": 1.15, "rain_probability": p} for _ in range(6)]

def field(theta=0.30, crop="Maize", stage="MID_SEASON", textures="loam", **kw):
    base = dict(theta=theta, root_depth_mm=700, soil_texture=textures, crop_key=crop,
                growth_stage=stage, irrigation_efficiency=0.75, water_budget_mm=500.0,
                is_rice=(crop == "Rice"), pond_mm=0.0)
    base.update(kw)
    return base

def slots(cur_h=6, gap_days=1):
    return [
        {"start": NOW_DT, "hours": cur_h, "reliable": True},
        {"start": NOW_DT + timedelta(days=gap_days), "hours": cur_h, "reliable": True},
    ]

print("=== Scenario 1: rain forecast, last slot before long gap, near stress threshold, critical stage ===")
r = evaluate_irrigation_recommendation(
    field(theta=0.115, textures="sandy"), slots(cur_h=8, gap_days=2), RAINY(p=0.85), now=NOW_DT)
print(f"  action={r['recommended_irrigation_action']} mm={r['recommended_irrigation_amount_mm']:.1f} "
      f"no_rain_stress={r['no_rain_scenario_stress_risk']:.2f} guard={r['guard']['verdict']}")
print(f"  warning: {(r['farmer_warning'] or 'None')[:140]}")

print("\n=== Scenario 2: no rain forecast, wet soil ===")
r = evaluate_irrigation_recommendation(
    field(theta=0.24, textures="loam"), slots(), DRY(), now=NOW_DT)
print(f"  action={r['recommended_irrigation_action']} mm={r['recommended_irrigation_amount_mm']:.1f} "
      f"no_rain_stress={r['no_rain_scenario_stress_risk']:.2f}")

print("\n=== Scenario 3: rain forecast but stale (72h old) ===")
stale = RAINY()
for d in stale:
    d["hours_since_issue"] = 72
r = evaluate_irrigation_recommendation(
    field(theta=0.105, textures="sandy"), slots(cur_h=6, gap_days=2), stale, now=NOW_DT)
print(f"  status={r['forecast_uncertainty_status']} action={r['recommended_irrigation_action']} "
      f"mm={r['recommended_irrigation_amount_mm']:.1f} no_rain_stress={r['no_rain_scenario_stress_risk']:.2f}")

print("\n=== Scenario 4: rain arrives as expected — full irrigation should NOT waste (excess check) ===")
r = evaluate_irrigation_recommendation(
    field(theta=0.24, textures="loam"), slots(gap_days=2), RAINY(p=0.9), now=NOW_DT)
print(f"  action={r['recommended_irrigation_action']} mm={r['recommended_irrigation_amount_mm']:.1f} "
      f"scores={[(s['plan'], s['score']) for s in r['scenario_analysis'][:3]]}")

print("\n=== Scenario 5: wet soil, extra irrigation may be inappropriate ===")
r = evaluate_irrigation_recommendation(
    field(theta=0.30, textures="loam"), slots(), RAINY(p=0.9), now=NOW_DT)
print(f"  action={r['recommended_irrigation_action']} mm={r['recommended_irrigation_amount_mm']:.1f} "
      f"no_rain_stress={r['no_rain_scenario_stress_risk']:.2f}")

print("\n=== Scenario 6: missing forecast entirely ===")
r = evaluate_irrigation_recommendation(
    field(theta=0.10, textures="sandy"), slots(cur_h=6, gap_days=2), [], now=NOW_DT)
print(f"  status={r['forecast_uncertainty_status']} action={r['recommended_irrigation_action']} "
      f"mm={r['recommended_irrigation_amount_mm']:.1f} no_rain_stress={r['no_rain_scenario_stress_risk']:.2f} "
      f"conf={r['confidence_status']}")

print("\n=== Scenario 7: infeasible — tiny slot, huge gap, sandy soil, no water budget ===")
r = evaluate_irrigation_recommendation(
    field(theta=0.12, textures="sandy", water_budget_mm=10.0),
    slots(cur_h=1, gap_days=5), RAINY(p=0.5), now=NOW_DT)
print(f"  action={r['recommended_irrigation_action']} mm={r['recommended_irrigation_amount_mm']:.1f} "
      f"no_rain_stress={r['no_rain_scenario_stress_risk']:.2f} infeasible={r['infeasible']} "
      f"reason={(r['infeasibility_reason'] or 'None')[:140]}")
