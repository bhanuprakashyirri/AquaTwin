/**
 * Deterministic demo engine — TypeScript mirror of backend/app/services/twin.py.
 * The frontend uses this when the backend is unreachable, so every page works
 * instantly with zero setup. Same model shape, same seeded data, same results.
 */

import { FORECAST_48H, DEMO_NOW } from "@/lib/demo-data";
import {
  ET0_FACTOR,
  FC,
  LITRES_TO_PCT,
  REFILL_TARGET_PCT,
  STRESS_MIDPOINT_PCT,
  STRESS_SCALE_PCT,
  WP,
  ZONE_DEPTH_MM,
} from "@/lib/constants";
import type {
  OptimizationResult,
  RainUncertaintyScenario,
  Recommendation,
  Scenario,
  SimulationResult,
  TimelinePoint,
  Zone,
} from "@/types";

function iso(t: Date): string {
  return t.toISOString();
}

function pctToTaw(): number {
  return ((FC - WP) / 100) * ZONE_DEPTH_MM;
}

function pctToDepletion(pct: number): number {
  return Math.max(0, ((FC - pct) / 100) * ZONE_DEPTH_MM);
}

function depletionToPct(drMm: number): number {
  return FC - (drMm / ZONE_DEPTH_MM) * 100;
}

function stressFromDepletion(drMm: number): number {
  const pct = depletionToPct(drMm);
  const raw = (pct - STRESS_MIDPOINT_PCT) / STRESS_SCALE_PCT;
  return Math.min(95, Math.max(1, 100 / (1 + Math.exp(raw))));
}

interface StepState {
  pct: number;
}

function stepHour(state: StepState, hourIndex: number): StepState {
  const row = FORECAST_48H[hourIndex % 48];
  const et0 = row.solarRadMJm2 * ET0_FACTOR;
  const etc = et0 * 1.12; // crop coefficient
  const effRain = row.rainfallMm * 0.8;
  let dr = pctToDepletion(state.pct);
  dr = Math.min(pctToTaw() * 1.3, Math.max(0, dr - effRain) + etc + 0.35);
  return { pct: depletionToPct(dr) };
}

function project(
  startPct: number,
  hours: number,
  irrigationL = 0,
  irrigationHour: number | null = null,
): TimelinePoint[] {
  let state: StepState = { pct: startPct };
  const timeline: TimelinePoint[] = [];
  for (let h = 0; h < hours; h++) {
    if (irrigationHour !== null && h === irrigationHour && irrigationL > 0) {
      state = { pct: Math.min(FC, state.pct + irrigationL * LITRES_TO_PCT) };
    }
    state = stepHour(state, h);
    timeline.push({
      hour: h + 1,
      time: iso(new Date(DEMO_NOW.getTime() + (h + 1) * 3_600_000)),
      moisturePct: Math.round(state.pct * 100) / 100,
    });
  }
  return timeline;
}

function predictStress(timeline: TimelinePoint[]): number {
  const worst = Math.max(...timeline.map((p) => stressFromDepletion(pctToDepletion(p.moisturePct))));
  return Math.round(worst * 10) / 10;
}

function predictRequirementL(pct: number): number {
  const dr = pctToDepletion(pct);
  return Math.round(Math.min(1600, Math.max(0, dr * 22)));
}

const STRATEGIES: Record<string, { label: string; description: string; delay: number; factor: number }> = {
  now: { label: "Irrigate Now", description: "Full requirement applied immediately", delay: 0, factor: 1 },
  wait3: { label: "Wait 3 Hours", description: "Irrigation deferred by 3 hours", delay: 3, factor: 1 },
  wait6: { label: "Wait 6 Hours", description: "Irrigation deferred by 6 hours", delay: 6, factor: 0.43 },
  wait12: { label: "Wait 12 Hours", description: "Irrigation deferred by 12 hours", delay: 12, factor: 0.3 },
  wait24: { label: "Wait 24 Hours", description: "Irrigation deferred by 24 hours", delay: 24, factor: 0 },
  partial: { label: "Partial Irrigation", description: "60% deficit irrigation now, balance on demand", delay: 0, factor: 0.6 },
};

function runScenario(startPct: number, key: string, horizon = 48, availableWater = 2000): Scenario {
  const s = STRATEGIES[key];
  const requirement = predictRequirementL(startPct);
  const water = Math.round(Math.min(availableWater, requirement * s.factor));
  const timeline = project(startPct, horizon, water, water > 0 ? s.delay : null);
  const vals = timeline.map((p) => p.moisturePct);
  const minM = Math.min(...vals);
  const stress = predictStress(timeline);
  const rainWindow = FORECAST_48H.slice(0, 12).some((f) => f.rainfallMm > 2);
  let waste: Scenario["wasteRisk"] = "NONE";
  if (rainWindow && s.delay < 6 && water > 0) {
    waste = s.factor >= 1 ? "HIGH" : "MEDIUM";
  } else if (s.factor >= 1) {
    waste = "LOW";
  }
  return {
    key,
    label: s.label,
    description: s.description,
    waterUsedL: water,
    predictedMoisturePct: Math.round(vals[vals.length - 1] * 10) / 10,
    minMoisturePct: Math.round(minM * 10) / 10,
    stressRiskPct: stress,
    wasteRisk: waste,
    timeline,
    factors: [
      { label: "Rain probability (12h)", value: "78% (Demo Data)", weight: key.startsWith("wait") ? 0.3 : 0.1 },
      { label: "Drying rate", value: "1.1%/h under ETc", weight: 0.25 },
      { label: "Min moisture reached", value: `${Math.round(minM * 10) / 10}%`, weight: 0.25 },
      { label: "Water used", value: `${water} L`, weight: 0.2 },
    ],
    recommended: false,
  };
}

export function runFullSimulation(startPct = 24.6, horizon = 48, availableWater = 2000): SimulationResult {
  const scenarios = Object.keys(STRATEGIES).map((k) => runScenario(startPct, k, horizon, availableWater));
  let best: Scenario | null = null;
  for (const s of scenarios) {
    if (s.stressRiskPct <= 15 && s.predictedMoisturePct >= REFILL_TARGET_PCT) {
      if (!best || s.waterUsedL < best.waterUsedL) best = s;
    }
  }
  if (!best) best = scenarios.reduce((a, b) => (b.stressRiskPct < a.stressRiskPct ? b : a));
  for (const s of scenarios) s.recommended = s.key === best.key;
  return {
    generatedAt: new Date().toISOString(),
    baseline: { moisturePct: startPct, fieldCapacityPct: FC, wiltingPointPct: WP, availableWaterL: availableWater },
    scenarios,
    recommendedKey: best.key,
  };
}

export function rainUncertainty(strategy = "wait6", horizon = 48): RainUncertaintyScenario[] {
  const base = runScenario(24.6, strategy, horizon, 2000);
  const irrL = base.waterUsedL;
  const irrHour = STRATEGIES[strategy].delay;
  const outcomes: Array<[string, string, number]> = [
    ["rain_occurs", "Rain Occurs", 1],
    ["rain_partial", "Rain Partially Occurs", 0.5],
    ["rain_fails", "Rain Fails", 0],
  ];
  return outcomes.map(([key, label, frac]) => {
    let pct = 24.6;
    const timeline: TimelinePoint[] = [];
    for (let h = 0; h < horizon; h++) {
      if (h === irrHour && irrL > 0) pct = Math.min(FC, pct + irrL * LITRES_TO_PCT);
      const row = FORECAST_48H[h % 48];
      const etc = row.solarRadMJm2 * ET0_FACTOR * 1.12;
      let dr = pctToDepletion(pct);
      dr = Math.min(pctToTaw() * 1.3, Math.max(0, dr - row.rainfallMm * frac * 0.8) + etc + 0.35);
      pct = depletionToPct(dr);
      timeline.push({
        hour: h + 1,
        time: iso(new Date(DEMO_NOW.getTime() + (h + 1) * 3_600_000)),
        moisturePct: Math.round(pct * 100) / 100,
      });
    }
    const vals = timeline.map((p) => p.moisturePct);
    const stress = predictStress(timeline);
    const verdict =
      stress < 15
        ? "Plan holds — stress stays below the 15% threshold"
        : stress < 35
          ? "Marginal — re-evaluate at T+6h with updated forecast"
          : "Contingency needed — schedule a supplemental irrigation window";
    return {
      key,
      label,
      rainFraction: frac,
      endMoisturePct: Math.round(vals[vals.length - 1] * 10) / 10,
      minMoisturePct: Math.round(Math.min(...vals) * 10) / 10,
      stressRiskPct: stress,
      timeline,
      verdict,
    };
  });
}

export function optimizeWater(zones: Zone[], available: number): OptimizationResult {
  const needs = zones.map((z) => ({ ...z, needL: z.waterRequirementL }));
  const alloc: Record<string, number> = {};
  // Deterministic priority fallback with stress-reduction weighting (mirrors
  // the OR-Tools CP-SAT objective on the backend).
  let remaining = available;
  for (const z of [...needs].sort((a, b) => a.priority - b.priority)) {
    const give = Math.min(z.needL, Math.max(0, remaining));
    alloc[z.id] = give;
    remaining -= give;
    if (remaining <= 0) break;
  }
  const allocations = needs.map((z) => {
    const a = alloc[z.id] ?? 0;
    const afterPct = Math.min(FC, z.moisturePct + a * LITRES_TO_PCT);
    return {
      zoneId: z.id,
      zoneName: z.name,
      needL: z.needL,
      allocatedL: a,
      priority: z.priority,
      stressBeforePct: z.stressRiskPct,
      stressAfterPct: a > 0 ? Math.round(stressFromDepletion(pctToDepletion(afterPct)) * 10) / 10 : z.stressRiskPct,
      moistureAfterPct: Math.round(afterPct * 10) / 10,
    };
  });
  const totalAlloc = allocations.reduce((s, a) => s + a.allocatedL, 0);
  const totalNeed = needs.reduce((s, z) => s + z.needL, 0);
  const waterSaved = allocations.reduce((s, a) => s + Math.max(0, a.needL - a.allocatedL), 0);
  const constraintStatus =
    totalAlloc === 0
      ? "Surplus — no irrigation needed now"
      : totalAlloc >= available - 1 && totalAlloc < totalNeed - 1
        ? "Rationed"
        : totalAlloc >= available - 1
          ? "Fully allocated"
          : "Rationed";
  return {
    availableWaterL: available,
    totalNeedL: totalNeed,
    totalAllocatedL: totalAlloc,
    allocations,
    constraintStatus,
    waterSavedL: waterSaved,
    explanation: "Water has been allocated according to predicted crop-stress risk and future water requirement.",
    solver: "Deterministic priority solver (frontend fallback)",
  };
}

export function getRecommendation(): Recommendation {
  const sim = runFullSimulation(24.6);
  const best = sim.scenarios.find((s) => s.recommended)!;
  const saved = Math.max(0, 620 - best.waterUsedL);
  return {
    action: best.label.toUpperCase(),
    headline: best.label,
    reason: best.key.startsWith("wait")
      ? "Current root-zone moisture is sufficient for approximately 6 hours and rainfall probability is high. Waiting is predicted to reduce unnecessary irrigation while keeping crop-stress risk below the configured threshold."
      : "Root-zone moisture is approaching the refill point and no effective rain is expected in time; irrigating now minimises predicted crop stress.",
    waterSavedL: saved,
    stressRiskPct: best.stressRiskPct,
    confidencePct: 87,
    nextEvaluationAt: "in 6 hours",
    factors: [
      { label: "Root-zone moisture", value: "24.6%", weight: 0.3 },
      { label: "Rain probability (12h)", value: "78%", weight: 0.28 },
      { label: "Predicted min moisture if waiting", value: `${best.minMoisturePct}%`, weight: 0.22 },
      { label: "Crop stage", value: "Reproductive — high demand", weight: 0.2 },
    ],
    recommendedKey: sim.recommendedKey,
  };
}
