/**
 * AquaTwin voice agent engine.
 *
 * Gemini Flash (via the backend's POST /api/agent/chat endpoint)
 * drives the agent when GEMINI_API_KEY is configured — it reasons
 * over the conversation, calls the field data tools, and operates
 * the site on its own (navigation, map layers, zone selection,
 * simulation, water-budget optimization).
 *
 * When no key is configured, a rule-based NLU engine (deterministic,
 * zero API keys, works fully offline) parses natural language into
 * intents and executes the matching tools.
 */

import { tools } from "./tools";
import type {
  FieldTwinState,
  IrrigationEvent,
  OptimizationResult,
  Recommendation,
  Sensor,
  SimulationResult,
  SystemStatus,
  WeatherForecastRow,
  Zone,
} from "@/types";

// ---------------------------------------------------------------- types

export type SiteAction =
  | { type: "navigate"; path: string }
  | { type: "layer"; layer: string }
  | { type: "zone"; zoneId: string }
  | { type: "simulate" }
  | { type: "optimize"; amount: number }
  | { type: "sidebar" }
  | { type: "refresh" };

export interface AgentResponse {
  text: string;
  actions: SiteAction[];
}

export interface AgentMessage {
  role: "user" | "agent";
  text: string;
}

export interface AgentContext {
  currentPath: string;
  history?: AgentMessage[];
}

type Intent =
  | { kind: "help" }
  | { kind: "greeting" }
  | { kind: "thanks" }
  | { kind: "sidebar" }
  | { kind: "refresh" }
  | { kind: "navigate"; path: string }
  | { kind: "layer"; layer: string }
  | { kind: "select_zone"; zoneId: string }
  | { kind: "zone_data"; zoneId: string | null; metric: string | null }
  | { kind: "extreme"; mode: "driest" | "wettest" | "stress" }
  | { kind: "field_state" }
  | { kind: "weather" }
  | { kind: "recommendation" }
  | { kind: "simulate" }
  | { kind: "optimize"; amount: number }
  | { kind: "history" }
  | { kind: "sensors" }
  | { kind: "status" }
  | { kind: "unknown" };

// ---------------------------------------------------------------- constants

const MAP_PAGES = ["/dashboard", "/twin"];

const PAGE_ALIASES: Record<string, { path: string; label: string; aliases: string[] }> = {
  dashboard: { path: "/dashboard", label: "Farm Overview", aliases: ["dashboard", "overview", "home"] },
  twin: { path: "/twin", label: "Field Twin", aliases: ["field twin", "digital twin", "twin", "map"] },
  simulator: { path: "/simulator", label: "What-If Simulator", aliases: ["simulator", "what-if simulator", "what if simulator"] },
  "water-budget": { path: "/water-budget", label: "Water Budget", aliases: ["water budget", "budget page"] },
  "field-health": { path: "/field-health", label: "Field Health", aliases: ["field health", "health page"] },
  analytics: { path: "/analytics", label: "Analytics", aliases: ["analytics", "analytics page", "reports"] },
  history: { path: "/history", label: "Irrigation History", aliases: ["irrigation history", "history", "history page"] },
  settings: { path: "/settings", label: "Settings", aliases: ["settings", "settings page"] },
};

const LAYER_LABELS: Record<string, string> = {
  moisture: "soil moisture",
  stress: "crop stress",
  ndvi: "vegetation health",
  priority: "irrigation priority",
};

const LAYER_KEYWORDS: Array<[string, RegExp]> = [
  ["moisture", /\b(moisture|wetness|soil wet)\b/],
  ["stress", /\b(stress)\b/],
  ["ndvi", /\b(ndvi|vegetation|green|health)\b/],
  ["priority", /\b(priority)\b/],
];

const HELP_TEXT =
  "I'm Aqua, your autonomous field agent. I can read live field conditions, zone moisture and stress, weather forecasts, sensors and irrigation history. " +
  "I can run what-if simulations, optimize water budgets, switch map layers, select zones, and navigate the entire dashboard. " +
  "Try: 'show zone B', 'when is rain expected', 'run the simulation', or 'optimize water with 1500 litres'.";

const GREETING_TEXT =
  "Hello! I'm Aqua, your field voice agent. Ask me about soil moisture, stress risk, or weather — or tell me to run a simulation or optimize the water budget.";

const UNKNOWN_TEXT =
  "I didn't catch that. I can check field conditions, zone details, weather and sensors, run simulations, optimize water, switch map layers, and navigate the dashboard. " +
  "Try 'show zone B', 'run the simulation', or 'optimize water with 1500 litres'.";

// ---------------------------------------------------------------- entry point

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8000";

/** Session-level availability cache — avoids a failed round-trip per message when the backend has no Gemini key. */
const remoteAgent = { enabled: true };

async function runRemoteAgent(
  input: string,
  ctx: AgentContext,
): Promise<AgentResponse> {
  const res = await fetch(`${API_BASE}/api/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [...(ctx.history ?? []), { role: "user", text: input }],
      currentPath: ctx.currentPath,
    }),
  });
  if (!res.ok) {
    if (res.status === 503) remoteAgent.enabled = false;
    throw new Error(`agent endpoint failed: ${res.status}`);
  }
  remoteAgent.enabled = true;
  return (await res.json()) as AgentResponse;
}

export async function runAgent(
  input: string,
  ctx: AgentContext,
): Promise<AgentResponse> {
  const text = input.trim();
  if (!text) return { text: UNKNOWN_TEXT, actions: [] };

  // Gemini Flash drives the agent when the backend has GEMINI_API_KEY
  // configured; the deterministic engine below is the offline fallback.
  if (remoteAgent.enabled) {
    try {
      return await runRemoteAgent(text, ctx);
    } catch {
      remoteAgent.enabled = false;
    }
  }
  return runLocalAgent(text, ctx);
}

async function runLocalAgent(
  input: string,
  ctx: AgentContext,
): Promise<AgentResponse> {
  const text = input.trim().toLowerCase();
  if (!text) return { text: UNKNOWN_TEXT, actions: [] };
  try {
    const intent = detectIntent(text);
    return await executeIntent(intent, ctx);
  } catch {
    return {
      text: "I hit a snag reading the field data. The demo engine is still running — try again in a moment.",
      actions: [],
    };
  }
}

// ---------------------------------------------------------------- NLU

function detectIntent(text: string): Intent {
  if (/\b(help|what can you do|commands?|how do you work|capabilities|what else can)\b/.test(text)) {
    return { kind: "help" };
  }
  if (/^(hi|hello|hey|yo|namaste|good (morning|afternoon|evening)|how are you|how's it going)\b/.test(text)) {
    return { kind: "greeting" };
  }
  if (/\b(thanks|thank you|thx|great job|awesome|perfect|nice work)\b/.test(text)) {
    return { kind: "thanks" };
  }
  if (/\b(sidebar|navigation menu|nav menu|the menu)\b/.test(text) && /\b(open|close|toggle|show|hide)\b/.test(text)) {
    return { kind: "sidebar" };
  }
  if (/\b(refresh|reload|sync|latest data|update (the )?(data|readings|values|dashboard))\b/.test(text)) {
    return { kind: "refresh" };
  }

  const amount = extractAmount(text);
  if (/\b(optimi[sz]e|optimi[sz]ation|allocate|allocation|water budget|budget)\b/.test(text)) {
    return { kind: "optimize", amount: amount ?? 2000 };
  }

  if (
    /\b(run|simulate|start|execute|compare|project)\b/.test(text) &&
    /\b(simulat|what[- ]?if|scenario|strateg|option|decision|future|48\s*hour|projection|outcome)\b/.test(text)
  ) {
    return { kind: "simulate" };
  }

  const zone = resolveZone(text);
  if (zone && /\b(select|click|inspect|highlight|focus|tap|choose|pick)\b/.test(text)) {
    return { kind: "select_zone", zoneId: zone };
  }
  if (/\bzone\b/.test(text) || zone) {
    return { kind: "zone_data", zoneId: zone, metric: extractMetric(text) };
  }

  if (/\b(driest|dryest|lowest moisture)\b/.test(text)) return { kind: "extreme", mode: "driest" };
  if (/\b(wettest|highest moisture)\b/.test(text)) return { kind: "extreme", mode: "wettest" };
  if (/\b(most stressed|highest stress|stressed zone|stress level)\b/.test(text)) {
    return { kind: "extreme", mode: "stress" };
  }

  const layer = detectLayer(text);
  if (layer) return { kind: "layer", layer };

  const page = detectNavigate(text);
  if (page) return { kind: "navigate", path: page };

  if (/\b(rain|weather|forecast|temperature|humidity|wind|solar|storm|cloud|monsoon)\b/.test(text)) {
    return { kind: "weather" };
  }
  if (/\b(moisture|root zone|field state|field status|water balance|evapotranspiration|\betc\b|crop water|field condition|how is the field|drying)\b/.test(text)) {
    return { kind: "field_state" };
  }
  if (/\b(recommend|should i|what should|advice|decision|best (action|option|time|strategy)|when (should|do|to) i irrigate|irrigate|watering)\b/.test(text)) {
    return { kind: "recommendation" };
  }
  if (/\b(history|past irrigation|previous|last irrigation|irrigation log|irrigation events|when did (we|i) irrigate|recent irrigation)\b/.test(text)) {
    return { kind: "history" };
  }
  if (/\b(sensors?|probes?|readings?|gauges?)\b/.test(text)) {
    return { kind: "sensors" };
  }
  if (/\b(system status|are you (online|working|alive|okay)|system health|status check|how is the system)\b/.test(text)) {
    return { kind: "status" };
  }

  return { kind: "unknown" };
}

function resolveZone(text: string): string | null {
  const m = text.match(/\bzone\s*[-]?\s*([a-d])\b/);
  if (m) return `zone-${m[1]}`;
  const words = ["first", "second", "third", "fourth"];
  for (let i = 0; i < words.length; i++) {
    if (new RegExp(`\\b${words[i]}\\s+zone\\b`).test(text)) return `zone-${"abcd"[i]}`;
  }
  return null;
}

function extractMetric(text: string): string | null {
  if (/\b(stress)\b/.test(text)) return "stress";
  if (/\b(need|requirement|require)\b/.test(text)) return "need";
  if (/\b(ndvi|vegetation)\b/.test(text)) return "ndvi";
  if (/\b(priority)\b/.test(text)) return "priority";
  if (/\b(moisture|wet|dry)\b/.test(text)) return "moisture";
  if (/\b(soil type|soil)\b/.test(text)) return "soil";
  if (/\b(area|size|hectare)\b/.test(text)) return "area";
  return null;
}

function detectLayer(text: string): string | null {
  const explicit = /\b(layer|map|switch|change|mode|view|display|show|tell|read|current|now)\b/.test(text);
  if (!explicit) return null;
  for (const [layer, re] of LAYER_KEYWORDS) {
    if (re.test(text)) return layer;
  }
  return null;
}

function detectNavigate(text: string): string | null {
  const navVerb = /\b(open|go|navigate|take me|show me the|load|visit|bring)\b/;
  for (const entry of Object.values(PAGE_ALIASES)) {
    for (const alias of entry.aliases) {
      if (!text.includes(alias)) continue;
      if (navVerb.test(text)) return entry.path;
      const bare = text.replace(/\b(page|screen|tab|please)\b/g, "").trim();
      if (bare === alias) return entry.path;
    }
  }
  return null;
}

function extractAmount(text: string): number | undefined {
  const m = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:l\b|litres?|liters?)/i);
  if (m) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isNaN(v) && v > 0) return Math.round(v);
  }
  const k = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (k) {
    const v = parseFloat(k[1]) * 1000;
    if (!Number.isNaN(v) && v > 0) return Math.round(v);
  }
  return undefined;
}

// ---------------------------------------------------------------- executors

async function executeIntent(intent: Intent, ctx: AgentContext): Promise<AgentResponse> {
  switch (intent.kind) {
    case "help":
      return { text: HELP_TEXT, actions: [] };
    case "greeting":
      return { text: GREETING_TEXT, actions: [] };
    case "thanks":
      return { text: "You're welcome. I'm here whenever the field needs attention.", actions: [] };
    case "sidebar":
      return { text: "Toggling the navigation sidebar.", actions: [{ type: "sidebar" }] };
    case "refresh":
      return { text: "Refreshing all field data now.", actions: [{ type: "refresh" }] };
    case "navigate": {
      const entry = Object.values(PAGE_ALIASES).find((e) => e.path === intent.path);
      return {
        text: `Opening ${entry?.label ?? "that page"}.`,
        actions: ctx.currentPath === intent.path ? [] : [{ type: "navigate", path: intent.path }],
      };
    }
    case "layer": {
      const actions: SiteAction[] = [];
      if (!MAP_PAGES.includes(ctx.currentPath)) actions.push({ type: "navigate", path: "/twin" });
      actions.push({ type: "layer", layer: intent.layer });
      return { text: `Switching the field map to the ${LAYER_LABELS[intent.layer] ?? intent.layer} layer.`, actions };
    }
    case "select_zone": {
      const actions: SiteAction[] = [];
      if (!MAP_PAGES.includes(ctx.currentPath)) actions.push({ type: "navigate", path: "/twin" });
      actions.push({ type: "zone", zoneId: intent.zoneId });
      return { text: `Selecting ${zoneName(intent.zoneId)} on the field map.`, actions };
    }
    case "zone_data":
      return execZoneData(intent, ctx);
    case "extreme":
      return execExtreme(intent, ctx);
    case "field_state":
      return execFieldState();
    case "weather":
      return execWeather();
    case "recommendation":
      return execRecommendation();
    case "simulate":
      return execSimulate(ctx);
    case "optimize":
      return execOptimize(intent.amount, ctx);
    case "history":
      return execHistory(ctx);
    case "sensors":
      return execSensors();
    case "status":
      return execStatus();
    case "unknown":
      return { text: UNKNOWN_TEXT, actions: [] };
  }
}

async function execZoneData(
  intent: { zoneId: string | null; metric: string | null },
  ctx: AgentContext,
): Promise<AgentResponse> {
  const { zones } = (await tools.get_zones.execute()) as { zones: Zone[] };
  let zone = intent.zoneId ? (zones.find((z) => z.id === intent.zoneId) ?? null) : null;
  if (!zone) zone = [...zones].sort((a, b) => a.moisturePct - b.moisturePct)[0];

  const actions: SiteAction[] = [];
  if (intent.zoneId) {
    if (!MAP_PAGES.includes(ctx.currentPath)) actions.push({ type: "navigate", path: "/twin" });
    actions.push({ type: "zone", zoneId: zone.id });
  }

  switch (intent.metric) {
    case "moisture":
      return {
        text: `${zone.name} soil moisture is ${zone.moisturePct.toFixed(1)} percent — ${
          zone.moisturePct < 22
            ? "below the healthy range. Field capacity is 34 percent, so it has room to take water."
            : "within the healthy range."
        }`,
        actions,
      };
    case "stress":
      return {
        text: `${zone.name} stress risk is ${zone.stressRiskPct} percent${
          zone.stressRiskPct > 15
            ? " — above the 15 percent comfort threshold."
            : " — comfortably below the 15 percent threshold."
        }`,
        actions,
      };
    case "need":
      return { text: `${zone.name} needs about ${zone.waterRequirementL.toLocaleString()} litres of water.`, actions };
    case "ndvi":
      return {
        text: `${zone.name} vegetation index is ${zone.ndvi.toFixed(2)} — ${
          zone.ndvi >= 0.6 ? "a healthy, vigorous canopy." : "moderate canopy vigor."
        }`,
        actions,
      };
    case "priority":
      return {
        text: `${zone.name} is priority P${zone.priority}${zone.priority === 1 ? " — the highest irrigation priority on the farm." : "."}`,
        actions,
      };
    case "soil":
      return { text: `${zone.name} has ${zone.soilType} soil across ${zone.areaHa} hectares.`, actions };
    case "area":
      return { text: `${zone.name} covers ${zone.areaHa} hectares of ${zone.soilType}.`, actions };
    default: {
      const driest = zone.moisturePct === Math.min(...zones.map((z) => z.moisturePct));
      return {
        text:
          `${zone.name}: moisture ${zone.moisturePct.toFixed(1)} percent, stress risk ${zone.stressRiskPct} percent, ` +
          `water requirement ${zone.waterRequirementL.toLocaleString()} litres, ${zone.soilType}, ` +
          `last irrigated ${zone.lastIrrigatedHoursAgo} hours ago, priority P${zone.priority}.` +
          (driest ? " It is the driest zone right now." : ""),
        actions,
      };
    }
  }
}

async function execExtreme(
  intent: { mode: "driest" | "wettest" | "stress" },
  ctx: AgentContext,
): Promise<AgentResponse> {
  const { zones } = (await tools.get_zones.execute()) as { zones: Zone[] };

  let zone: Zone;
  let text: string;
  if (intent.mode === "wettest") {
    zone = [...zones].sort((a, b) => b.moisturePct - a.moisturePct)[0];
    text = `The wettest zone is ${zone.name} at ${zone.moisturePct.toFixed(1)} percent moisture — no irrigation needed there.`;
  } else if (intent.mode === "stress") {
    zone = [...zones].sort((a, b) => b.stressRiskPct - a.stressRiskPct)[0];
    text =
      `${zone.name} has the highest stress risk at ${zone.stressRiskPct} percent, with moisture at ` +
      `${zone.moisturePct.toFixed(1)} percent. It needs about ${zone.waterRequirementL.toLocaleString()} litres — I'd prioritize it.`;
  } else {
    zone = [...zones].sort((a, b) => a.moisturePct - b.moisturePct)[0];
    text =
      `The driest zone is ${zone.name} at ${zone.moisturePct.toFixed(1)} percent moisture, with ` +
      `${zone.stressRiskPct} percent stress risk and a ${zone.waterRequirementL.toLocaleString()} litre requirement. ` +
      `It's priority P${zone.priority} — I'd irrigate there first.`;
  }

  const actions: SiteAction[] = [];
  if (!MAP_PAGES.includes(ctx.currentPath)) actions.push({ type: "navigate", path: "/twin" });
  actions.push({ type: "zone", zoneId: zone.id });
  return { text, actions };
}

async function execFieldState(): Promise<AgentResponse> {
  const st = (await tools.get_field_state.execute()) as FieldTwinState;
  return {
    text:
      `Root-zone moisture is ${st.rootZoneMoisturePct.toFixed(1)} percent, ` +
      `${st.moisture6hDeltaPct < 0 ? "down" : "up"} ${Math.abs(st.moisture6hDeltaPct).toFixed(1)} points in the last 6 hours. ` +
      `The crop is losing ${st.evapotranspirationMmDay} millimetres of water per day, with ` +
      `${st.effectiveRainfallMm48h} millimetres of effective rainfall expected over the next 48 hours. ` +
      `Available water in the root zone is ${st.availableWaterMm} millimetres against a holding capacity of ${st.soilWaterHoldingMm} millimetres.`,
    actions: [],
  };
}

async function execWeather(): Promise<AgentResponse> {
  const wx = (await tools.get_weather.execute()) as {
    summary: { nextRainProbabilityPct: number; nextRainInHours: number; tempNowC: number };
    forecast: WeatherForecastRow[];
  };
  const total48 = wx.forecast.reduce((a, r) => a + r.rainfallMm, 0);
  return {
    text:
      `Rain is ${wx.summary.nextRainProbabilityPct} percent likely in about ${wx.summary.nextRainInHours} hours. ` +
      `It's currently ${wx.summary.tempNowC} degrees. The 48-hour forecast shows ${total48.toFixed(1)} millimetres of total rainfall.`,
    actions: [],
  };
}

async function execRecommendation(): Promise<AgentResponse> {
  const rec = (await tools.get_recommendation.execute()) as Recommendation;
  return {
    text:
      `My recommendation: ${rec.headline.toLowerCase()}. That saves about ${rec.waterSavedL.toLocaleString()} litres, ` +
      `keeps stress risk at ${rec.stressRiskPct} percent, with ${rec.confidencePct} percent confidence. ${rec.reason}`,
    actions: [],
  };
}

async function execSimulate(ctx: AgentContext): Promise<AgentResponse> {
  const state = (await tools.get_field_state.execute()) as FieldTwinState;
  const sim = (await tools.run_simulation.execute({ startPct: state.rootZoneMoisturePct })) as SimulationResult;
  const best = sim.scenarios.find((s) => s.recommended) ?? sim.scenarios[0];

  const actions: SiteAction[] = [];
  if (ctx.currentPath !== "/simulator") actions.push({ type: "navigate", path: "/simulator" });
  actions.push({ type: "simulate" });

  return {
    text:
      `Simulation complete. Best option: ${best.label.toLowerCase()} — uses ${best.waterUsedL.toLocaleString()} litres, ` +
      `keeps stress at ${best.stressRiskPct} percent with a minimum moisture of ${best.minMoisturePct} percent, ` +
      `and waste risk is ${best.wasteRisk.toLowerCase()}.`,
    actions,
  };
}

async function execOptimize(amount: number, ctx: AgentContext): Promise<AgentResponse> {
  const opt = (await tools.optimize_water.execute({ availableWaterL: amount })) as OptimizationResult;
  const funded = opt.allocations.filter((a) => a.allocatedL > 0);
  const deferred = opt.allocations.filter((a) => a.allocatedL === 0);
  const parts = funded.map((a) => `${a.allocatedL.toLocaleString()} litres to ${a.zoneName}`);

  const actions: SiteAction[] = [];
  if (ctx.currentPath !== "/water-budget") actions.push({ type: "navigate", path: "/water-budget" });
  actions.push({ type: "optimize", amount });

  return {
    text:
      `With ${amount.toLocaleString()} litres against ${opt.totalNeedL.toLocaleString()} litres of demand: ${parts.join(", ")}.` +
      (deferred.length
        ? ` ${deferred.map((d) => d.zoneName).join(" and ")} ${deferred.length > 1 ? "are" : "is"} deferred — lowest benefit per litre.`
        : "") +
      ` Projected saving is ${opt.waterSavedL.toLocaleString()} litres.`,
    actions,
  };
}

async function execHistory(ctx: AgentContext): Promise<AgentResponse> {
  const { events } = (await tools.get_history.execute()) as { events: IrrigationEvent[] };
  const recent = events.slice(0, 3);
  const summary = recent.map((e) => {
    const d = new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return e.decision === "Waited"
      ? `${d}: waited in ${e.zone} — ${e.reason.toLowerCase()}`
      : `${d}: ${e.decision.toLowerCase()} ${e.zone} with ${e.appliedWaterL.toLocaleString()} litres — ${e.reason.toLowerCase()}`;
  });

  const actions: SiteAction[] =
    ctx.currentPath === "/history" ? [] : [{ type: "navigate", path: "/history" }];

  return { text: `Recent irrigation decisions. ${summary.join(". ")}.`, actions };
}

async function execSensors(): Promise<AgentResponse> {
  const { sensors } = (await tools.get_sensors.execute()) as { sensors: Sensor[] };
  const soil = sensors.filter((s) => s.kind === "soil_moisture");
  const temps = sensors.filter((s) => s.kind === "temperature");
  const soilText = soil.map((s) => `${s.lastValue.toFixed(1)} percent in ${zoneName(s.zoneId)}`).join(", ");
  const tempText = temps.map((s) => s.lastValue.toFixed(0)).join(" to ");
  return {
    text:
      `${sensors.length} sensors reporting. Soil moisture: ${soilText}. ` +
      `Air temperature between ${tempText} degrees. The rain gauge shows no rainfall.`,
    actions: [],
  };
}

async function execStatus(): Promise<AgentResponse> {
  const st = (await tools.get_system_status.execute()) as SystemStatus;
  return {
    text:
      `All systems normal. The digital twin is ${st.digitalTwin.toLowerCase()}, weather data is ${st.weather.toLowerCase()}, ` +
      `and the sensor stream is in ${st.sensorStream.toLowerCase()} mode.`,
    actions: [],
  };
}

function zoneName(id: string): string {
  return `Zone ${id.replace("zone-", "").toUpperCase()}`;
}
