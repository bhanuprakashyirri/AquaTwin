# Missed-Rain Protection & Electricity-Slot Risk Management

This feature prevents AquaTwin from ever telling a farmer to **skip an available
irrigation slot merely because rain is predicted** — the classic failure mode
where the forecast is wrong, the next agricultural power slot is days away, and
the crop is left to stress with no way to pump water.

It is implemented as a **slot-aware, risk-sensitive decision engine**:

* Engine: [backend/app/services/missed_rain_safety.py](../backend/app/services/missed_rain_safety.py)
* API:    `POST /api/safety/missed-rain`, `GET /api/safety/policy`
* Tests:  [backend/tests/test_missed_rain_safety.py](../backend/tests/test_missed_rain_safety.py) (17 tests, all required sections A–G)
* Data:   `dataset/` (see [dataset/dataset_meta.json](../dataset/dataset_meta.json))

## How the decision works (sections A–E of the requirement)

1. **Plan across the full power-constrained period (A).** The engine takes the
   farmer's electricity slots (`power_slots`), identifies the current slot and
   the *next feasible* slot, and simulates every irrigation action from now
   until the next opportunity — not just the next few hours.
2. **Evaluate forecast-failure scenarios (B).** Four contrary-to-forecast
   scenarios are simulated: *expected rainfall*, *lower-than-forecast*,
   *delayed* (arrives after the protection window), and *no rainfall at all*.
   Probabilities come from the forecast when calibrated; when the forecast is
   **stale or missing**, conservative no-rain assumptions are used and the
   forecast rainfall amount is zeroed. Rain is never described as guaranteed.
   Effective rainfall is separated from occurrence: infiltration capacity,
   runoff, existing soil water and crop demand (ETc) are all modeled.
3. **Compare feasible actions (C).** No-irrigation / partial / full modeled
   refill are scored across all scenarios on root-zone water, crop-stress risk
   (Ks), expected effective rainfall, excess-water (runoff + deep percolation)
   and the remaining water budget. Recommendations never exceed the modeled
   refill requirement or the field's storage/budget constraints.
4. **Missed-rain safety guard (D).** Before any "skip" advice is issued, the
   engine computes the no-rain-scenario stress risk. If that risk exceeds the
   crop-specific configurable threshold, an unconditional "no irrigation
   needed" is forbidden; the engine instead searches for the smallest
   protective (partial or full) action that removes the risk without
   unacceptable excess-water risk. If nothing is feasible, it **discloses the
   unresolved risk and requires human verification** instead of pretending the
   risk is gone.
5. **Risk-sensitive optimization (E).** The objective is
   `expected_upside − 2.5·adverse_case_stress − 0.5·water_use − 1.5·saturation − 0.8·excess_water`,
   a configurable risk-sensitive objective that weights the adverse outcome,
   not just the average forecast, and includes critical-growth-stage priority.

## Crop-specific thresholds (no universal constant)

MAD (maximum allowable depletion) thresholds are calibrated per crop from
`dataset/train.csv` (raw_mm/taw_mm ratio, n>5,000 rows per crop) and the
field-day dataset's `depletion_fraction_p` column:

| Crop      | MAD (p) |
|-----------|---------|
| Rice      | 0.20    |
| Chilli    | 0.30    |
| Groundnut | 0.50    |
| Maize     | 0.55    |
| Cotton    | 0.65    |

Forecast-withholding factors (`DOWNWEIGHT`) are derived from the dataset's
reliability curve: forecast ≥10 mm events verified as actual rain in only
2–12% of cases, so the "delayed"/"lower" scenarios are heavily weighted.

## Farmer-facing output (F)

Every recommendation includes: `current_power_slot`, `next_feasible_power_slot`,
`forecast_rain_probability`, `forecast_uncertainty_status`,
`no_rain_scenario_stress_risk`, `recommended_irrigation_action`,
`recommended_irrigation_amount_mm`, `risk_of_waiting_until_next_slot`,
`reason_for_recommendation`, `data_quality_status`, `confidence_status`, plus a
`farmer_warning` exactly of the required form, shown **only** when the scenario
analysis supports it (guard triggered + protective action exists, or no
feasible action remains).

## Example request

```bash
curl -X POST http://localhost:8000/api/safety/missed-rain \
  -H "Content-Type: application/json" \
  -d '{
    "field_state": {
      "theta": 0.115, "root_depth_mm": 700, "soil_texture": "sandy",
      "crop_key": "Maize", "growth_stage": "MID_SEASON",
      "irrigation_efficiency": 0.75, "water_budget_mm": 500.0
    },
    "power_slots": [
      {"start": "2026-10-10T09:00:00Z", "hours": 8, "reliable": true},
      {"start": "2026-10-12T09:00:00Z", "hours": 8, "reliable": true}
    ],
    "daily_forecast": [
      {"rain_mm": 25.0, "et0_mm": 5.0, "kc": 1.15, "rain_probability": 0.85}
    ]
  }'
```

The response recommends protective irrigation with the explicit warning:
*"Rain is forecast, but it is not guaranteed. Your next electricity slot is
tomorrow. Skipping irrigation now could increase crop-water stress if the rain
fails. AquaTwin has compared waiting with protective irrigation using the
currently available field data."*

## Policy configuration

`GET /api/safety/policy` returns the full policy; `policy_overrides` in the
request may tune `max_acceptable_stress`, `max_saturation_fraction`,
`max_data_age_hours`, and more. All thresholds are configurable and reviewed
against credible agricultural guidance (FAO-56 Ks formulation and per-crop MAD).

## Automated failure-scenario tests (G)

`python -m unittest tests.test_missed_rain_safety -v` (from `backend/`) covers:

1. Rain forecast but does not arrive → guard triggers protective irrigation.
2. Current slot last before a long gap → plans across the whole period.
3. Field begins near its crop-specific stress threshold.
4. Crop at a critical growth stage → higher modeled risk.
5. Rain arrives as expected → no unnecessary irrigation is recommended.
6. Soil already wet → extra irrigation scores worse (excess-water penalty).
7. Forecast missing / stale / uncalibrated → conservative assumptions.
8. No feasible action keeps stress below the limit → infeasibility disclosed,
   never hidden.

All 31 backend tests (including the rest of the API suite) pass.
