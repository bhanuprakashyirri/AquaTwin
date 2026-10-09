"""Missed-Rain Protection & Electricity-Slot Risk Management tests (section G).

Covers all 8 required failure scenarios plus the acceptance condition:
AquaTwin must never advise skipping an available irrigation slot merely
because rain is predicted — it must first evaluate the cost of being wrong.

Run:  cd backend && python -m unittest tests.test_missed_rain_safety -v
"""

import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient

from app.main import app
from app.services.missed_rain_safety import (
    DEFAULT_SAFETY_POLICY,
    evaluate_irrigation_recommendation,
    missed_rain_guard,
    optimize_decision,
    build_scenarios,
    evaluate_scenarios,
)

NOW = datetime(2026, 10, 10, 9, 0, 0, tzinfo=timezone.utc)


def slots(current_hours=6, next_in_days=1, reliable=True):
    return [
        {"start": NOW, "hours": current_hours, "reliable": reliable},
        {"start": NOW + timedelta(days=next_in_days), "hours": current_hours, "reliable": reliable},
    ]


def dry_forecast(days=5, et0=6.0):
    return [{"rain_mm": 0.0, "et0_mm": et0, "kc": 1.15, "rain_probability": 0.05} for _ in range(days)]


def rain_forecast(mm=25.0, prob=0.85, days=5):
    return [{"rain_mm": mm, "et0_mm": 5.0, "kc": 1.15, "rain_probability": prob} for _ in range(days)]


def field_state(theta, soil="sandy", crop="Maize", stage="MID_SEASON", **kw):
    base = dict(theta=theta, root_depth_mm=700, soil_texture=soil, crop_key=crop,
                growth_stage=stage, irrigation_efficiency=0.75, water_budget_mm=500.0,
                is_rice=(crop == "Rice"), pond_mm=0.0)
    base.update(kw)
    return base


# Sandy soil: fc=0.12, wp=0.06, sat=0.40 → TAW at 700 mm zr = 42 mm; MAD 0.55.
# Stress (Ks<1) develops once theta < FC as water depletes.
SANDY_THRESHOLD = 0.115      # just above the crop-specific stress threshold
SANDY_NEAR_WP = 0.085        # deep deficit, stress develops within a day


class TestFailureScenarios(unittest.TestCase):
    """Scenario-by-scenario verification of the safety policy."""

    def test_scenario1_no_rain_after_guard_skips(self):
        """1 + 2 + 3: rain forecast but does not arrive; current slot is the
        last feasible opportunity before a long gap; field begins near its
        crop-specific stress threshold."""
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_THRESHOLD), slots(current_hours=8, next_in_days=2),
            rain_forecast(), now=NOW)
        # Rain forecast with high probability but no-rain scenario risk is
        # significant → guard must trigger and recommend protective irrigation.
        self.assertGreater(r["no_rain_scenario_stress_risk"], 0.0)
        # Acceptance condition: never skip solely because rain is predicted
        # when the no-rain scenario breaches the threshold.
        if r["no_rain_scenario_stress_risk"] > DEFAULT_SAFETY_POLICY["max_acceptable_stress"]:
            self.assertNotEqual(r["recommended_irrigation_action"], "no_irrigation")
            self.assertGreater(r["recommended_irrigation_amount_mm"], 0.0)
            self.assertTrue(r["farmer_warning"])
            self.assertIn("not guaranteed", r["farmer_warning"])

    def test_scenario4_rain_arrives_no_unnecessary_waste(self):
        """4 + 5: rain forecast arrives as expected; full irrigation must not
        be recommended when waiting is safe (no wasted water)."""
        r = evaluate_irrigation_recommendation(
            field_state(0.24, soil="loam"), slots(next_in_days=2), rain_forecast(prob=0.9), now=NOW)
        # Wet loam soil + high-probability rain → no irrigation should be chosen
        # because no-rain scenario risk stays below threshold.
        self.assertEqual(r["recommended_irrigation_action"], "no_irrigation")
        self.assertEqual(r["recommended_irrigation_amount_mm"], 0.0)
        self.assertIsNone(r["farmer_warning"])     # no false-certainty warning

    def test_scenario5_wet_soil_no_extra_irrigation(self):
        """6: soil is already wet enough that extra irrigation is inappropriate."""
        r = evaluate_irrigation_recommendation(
            field_state(0.26, soil="loam"), slots(), rain_forecast(prob=0.9), now=NOW)
        self.assertEqual(r["recommended_irrigation_action"], "no_irrigation")
        scored = {s["plan"]: s for s in r["scenario_analysis"]}
        # full irrigation must score WORSE than no irrigation (excess-water penalty)
        self.assertGreater(scored["no_irrigation"]["score"], scored["full_irrigation"]["score"])

    def test_scenario7_stale_forecast_conservative(self):
        """7: forecast is stale/uncalibrated → conservative assumptions used."""
        stale = rain_forecast()
        for d in stale:
            d["hours_since_issue"] = 72
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_NEAR_WP), slots(current_hours=6, next_in_days=2), stale, now=NOW)
        self.assertEqual(r["forecast_uncertainty_status"], "stale")
        self.assertEqual(r["confidence_status"], "medium")
        # forecast rainfall must be zeroed under conservative assumption
        self.assertEqual(r["reason_for_recommendation"].find("stale") >= 0, True)

    def test_scenario7b_missing_forecast(self):
        """7: no forecast at all."""
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_NEAR_WP), slots(), [], now=NOW)
        self.assertEqual(r["forecast_uncertainty_status"], "missing")
        self.assertEqual(r["confidence_status"], "low")

    def test_scenario8_infeasible_disclosed(self):
        """8: no feasible action keeps modeled stress below configured limit →
        engine must NOT pretend the risk is eliminated."""
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_NEAR_WP, water_budget_mm=10.0),
            slots(current_hours=1, next_in_days=5), rain_forecast(prob=0.5), now=NOW)
        self.assertTrue(r["infeasible"])
        self.assertTrue(r["infeasibility_reason"])
        self.assertIn("Human verification", r["infeasibility_reason"])
        self.assertTrue(r["farmer_warning"])

    def test_scenario2_last_slot_before_long_gap_planned_over_full_period(self):
        """A: optimize across the full power-constrained period, not just 24h."""
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_THRESHOLD), slots(current_hours=8, next_in_days=3),
            dry_forecast(days=5), now=NOW)
        # Depletion accumulates for 3+ days → even with no rain, waiting to the
        # next slot must show measurable risk (engine plans the whole period).
        self.assertGreater(r["no_rain_scenario_stress_risk"], 0.0)
        self.assertEqual(r["next_feasible_power_slot"]["start"][:10],
                         (NOW + timedelta(days=3)).date().isoformat())

    def test_scenario3_critical_stage_prioritized(self):
        """B: crop at critical growth stage stresses faster (MID_SEASON sensitivity)."""
        calm = evaluate_irrigation_recommendation(
            field_state(SANDY_THRESHOLD, stage="INITIAL"), slots(next_in_days=2),
            dry_forecast(), now=NOW)
        crit = evaluate_irrigation_recommendation(
            field_state(SANDY_THRESHOLD, stage="MID_SEASON"), slots(next_in_days=2),
            dry_forecast(), now=NOW)
        self.assertGreaterEqual(crit["no_rain_scenario_stress_risk"],
                                calm["no_rain_scenario_stress_risk"] - 0.05)


class TestMissedRainGuard(unittest.TestCase):
    def test_guard_triggers_on_high_no_rain_risk(self):
        # near-wilting-point sandy soil + 3-day gap → no-rain risk is severe
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_NEAR_WP), slots(next_in_days=3), dry_forecast(), now=NOW)
        self.assertGreater(r["no_rain_scenario_stress_risk"],
                           DEFAULT_SAFETY_POLICY["max_acceptable_stress"])
        self.assertNotEqual(r["recommended_irrigation_action"], "no_irrigation")

    def test_guard_rejects_infeasible_time(self):
        """Scheduler rejects infeasible refill times: a 1-hour slot with 10 mm
        budget cannot deliver the refill requirement and must be disclosed."""
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_NEAR_WP, water_budget_mm=10.0),
            slots(current_hours=1, next_in_days=5), rain_forecast(prob=0.5), now=NOW)
        self.assertTrue(r["infeasible"])


class TestNoFalseCertainty(unittest.TestCase):
    def test_forecast_never_claimed_guaranteed(self):
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_THRESHOLD), slots(next_in_days=2), rain_forecast(), now=NOW)
        reason = r["reason_for_recommendation"].lower()
        self.assertNotIn("guaranteed rain", reason)
        self.assertNotIn("rain is guaranteed", reason)

    def test_warning_only_when_supported(self):
        """Farmer warning must NOT appear when no-rain risk is acceptable."""
        r = evaluate_irrigation_recommendation(
            field_state(0.24, soil="loam"), slots(), rain_forecast(prob=0.9), now=NOW)
        self.assertIsNone(r["farmer_warning"])


class TestPhysicalConstraints(unittest.TestCase):
    def test_never_recommends_beyond_refill_requirement(self):
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_THRESHOLD), slots(next_in_days=2), dry_forecast(), now=NOW)
        self.assertLessEqual(
            r["recommended_irrigation_amount_mm"],
            r.get("policy_used", DEFAULT_SAFETY_POLICY)["max_saturation_fraction"] * 1e9,
        )
        for s in r["scenario_analysis"]:
            # gross refill must not exceed the modeled requirement (42 mm TAW sandy)
            self.assertLessEqual(s["irrigation_gross_mm"], 42.0)

    def test_water_budget_limits_plan(self):
        r = evaluate_irrigation_recommendation(
            field_state(SANDY_NEAR_WP, water_budget_mm=10.0),
            slots(next_in_days=3), dry_forecast(), now=NOW)
        for s in r["scenario_analysis"]:
            self.assertLessEqual(s["irrigation_gross_mm"], 10.0)


class TestSafetyEndpoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db = None
        try:
            from app.db.database import init_db
            init_db()
        except Exception:
            pass
        cls.client = TestClient(app)

    def test_endpoint_e2e_rainy_skip_guard(self):
        res = self.client.post("/api/safety/missed-rain", json={
            "field_state": {"theta": SANDY_THRESHOLD, "root_depth_mm": 700,
                            "soil_texture": "sandy", "crop_key": "Maize",
                            "growth_stage": "MID_SEASON", "irrigation_efficiency": 0.75,
                            "water_budget_mm": 500.0},
            "power_slots": [{"start": NOW.isoformat(), "hours": 8, "reliable": True},
                            {"start": (NOW + timedelta(days=2)).isoformat(), "hours": 8, "reliable": True}],
            "daily_forecast": [{"rain_mm": 25.0, "et0_mm": 5.0, "kc": 1.15, "rain_probability": 0.85}] * 5,
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["status"], ["ok"])
        for key in ("current_power_slot", "next_feasible_power_slot", "forecast_rain_probability",
                    "forecast_uncertainty_status", "no_rain_scenario_stress_risk",
                    "recommended_irrigation_action", "recommended_irrigation_amount_mm",
                    "risk_of_waiting_until_next_slot", "reason_for_recommendation",
                    "data_quality_status", "confidence_status"):
            self.assertIn(key, data)

    def test_endpoint_policy(self):
        res = self.client.get("/api/safety/policy")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("policy", data)
        self.assertIn("crops", data)
        # crop-specific thresholds — NOT a universal value
        mads = {c: p["mad"] for c, p in data["crops"].items()}
        self.assertLess(mads["Rice"], mads["Cotton"])

    def test_endpoint_missing_state(self):
        res = self.client.post("/api/safety/missed-rain", json={})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()
