"""Aqua voice agent — Gemini-driven conversational field control.

Receives the conversation, reasons with Gemini Flash over the same
data tools the dashboard uses, and returns a spoken-friendly reply
plus site-control actions (navigation, map layers, zone selection,
simulation, water-budget optimization) that the frontend applies.
"""

from __future__ import annotations

from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.v1.dashboard import recommendation, system_status
from app.api.v1.field_twin import (
    field_sensors,
    field_state,
    field_zones,
)
from app.api.v1.irrigation import (
    field_history,
    water_budget_optimize,
    water_fingerprint,
)
from app.api.v1.weather import field_weather
from app.api.v1.simulation import simulation_rain, simulation_run
from app.core.config import settings
from app.core.logging import logger
from app.db.database import get_field, get_zones

router = APIRouter(tags=["agent"])

FIELD_ID = "field-a"
MAX_TOOL_ROUNDS = 5
GEMINI_TIMEOUT_S = 45.0
MAP_PAGES = ("/dashboard", "/twin")
PAGES = (
    "/dashboard",
    "/twin",
    "/simulator",
    "/water-budget",
    "/field-health",
    "/analytics",
    "/history",
    "/settings",
)
LAYERS = ("moisture", "stress", "ndvi", "priority")
ZONE_IDS = ("zone-a", "zone-b", "zone-c", "zone-d")

SYSTEM_PROMPT = (
    "You are Aqua, the autonomous voice agent for AquaTwin, an AI irrigation "
    "intelligence dashboard for a rice farm (field-a near Bhimavaram, rice "
    "crop MTU-7029, reproductive stage).\n\n"
    "You operate the site yourself: read live field data with the data tools, "
    "and drive the UI with the control tools. Always ground your answers in "
    "real tool results — never invent numbers.\n\n"
    "Rules:\n"
    "- Answer in 1-3 short, spoken-friendly sentences using real values from "
    "the tools.\n"
    "- When the user asks to see, show, select, switch, open, check or go "
    "somewhere, call the matching control tool so the site responds — not "
    "just a text reply.\n"
    "- For 'run the simulation': call run_simulation, then open_simulator.\n"
    "- For 'optimize water': call optimize_water with the amount named "
    "(default 2000 litres), then set_water_budget with the same amount.\n"
    "- Zone IDs are zone-a to zone-d. Map layers are moisture, stress, ndvi, "
    "priority.\n"
    "- If a tool reports data is unavailable, say so honestly and suggest "
    "connecting telemetry.\n"
    "- If you cannot help, explain what you can do instead."
)


# ---------------------------------------------------------------- models

class AgentMessage(BaseModel):
    role: str
    text: str


class AgentChatRequest(BaseModel):
    messages: List[AgentMessage]
    currentPath: str = "/"


class AgentToolContext:
    """Accumulates site-control actions during a conversation turn."""

    def __init__(self, current_path: str) -> None:
        self.current_path = current_path
        self.actions: List[Dict[str, Any]] = []


# ---------------------------------------------------------------- data tools

def _map_zone(z: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": z.get("id"),
        "name": z.get("name"),
        "areaHa": z.get("area_ha", 0.0),
        "soilType": z.get("soil_type", ""),
        "moisturePct": z.get("moisture_pct") or 0.0,
        "stressRiskPct": z.get("stress_risk_pct") or 0.0,
        "waterRequirementL": z.get("water_requirement_l") or 0.0,
        "rainExposure": z.get("rain_exposure") or "Low",
        "lastIrrigatedHoursAgo": z.get("last_irrigated_hours_ago") or 0.0,
        "ndvi": z.get("ndvi") or 0.0,
        "priority": z.get("priority") or 5,
    }


def _map_sensor(s: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": s.get("id"),
        "zoneId": s.get("zone_id"),
        "kind": s.get("kind"),
        "position": s.get("position"),
        "depthCm": s.get("depth_cm"),
        "lastValue": s.get("last_value"),
        "lastReadingAt": s.get("last_reading_at"),
        "status": s.get("status"),
    }


def _map_event(e: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "date": e.get("date"),
        "zone": e.get("zone"),
        "appliedWaterL": e.get("applied_water_l", 0.0),
        "predictedRequirementL": e.get("predicted_requirement_l", 0.0),
        "moistureResponsePct": e.get("moisture_response_pct") or 0.0,
        "decision": e.get("decision"),
        "reason": e.get("reason"),
    }


def _exec_get_field_state(args: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return field_state(FIELD_ID)
    except HTTPException:
        return {
            "status": "unavailable",
            "message": "Field twin baseline not recorded yet. Connect soil sensors to initialize it.",
        }


def _exec_get_zones(args: Dict[str, Any]) -> Dict[str, Any]:
    zones = get_zones(FIELD_ID)
    return {"zones": [_map_zone(z) for z in zones]}


def _exec_get_weather(args: Dict[str, Any]) -> Dict[str, Any]:
    return field_weather(FIELD_ID)


def _exec_get_sensors(args: Dict[str, Any]) -> Dict[str, Any]:
    result = field_sensors(FIELD_ID)
    return {
        "source": result.get("source"),
        "sensors": [_map_sensor(s) for s in result.get("sensors", [])],
    }


def _exec_get_history(args: Dict[str, Any]) -> Dict[str, Any]:
    result = field_history(FIELD_ID)
    return {"events": [_map_event(e) for e in result.get("events", [])]}


def _exec_get_recommendation(args: Dict[str, Any]) -> Dict[str, Any]:
    return recommendation(FIELD_ID)


def _exec_get_system_status(args: Dict[str, Any]) -> Dict[str, Any]:
    return system_status(FIELD_ID)


def _exec_get_water_fingerprint(args: Dict[str, Any]) -> Dict[str, Any]:
    return water_fingerprint(FIELD_ID)


def _exec_run_simulation(args: Dict[str, Any]) -> Dict[str, Any]:
    return simulation_run(
        {
            "startMoisturePct": float(args.get("startPct", 24.6)),
            "horizonHours": int(args.get("horizonHours", 48)),
            "availableWaterL": float(args.get("availableWaterL", 2000)),
            "fieldId": FIELD_ID,
        }
    )


def _exec_run_rain_uncertainty(args: Dict[str, Any]) -> Dict[str, Any]:
    return simulation_rain(
        {"strategy": str(args.get("strategy", "wait6")), "fieldId": FIELD_ID}
    )


def _exec_optimize_water(args: Dict[str, Any]) -> Dict[str, Any]:
    return water_budget_optimize(
        {"availableWaterL": float(args.get("availableWaterL", 2000)), "fieldId": FIELD_ID}
    )


# ---------------------------------------------------------------- control tools

def _exec_navigate_to(args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    path = str(args.get("path", "/dashboard"))
    if path not in PAGES:
        return {"error": f"Unknown page. Valid pages: {', '.join(PAGES)}"}
    if ctx.current_path != path:
        ctx.actions.append({"type": "navigate", "path": path})
    return {"navigated": path}


def _exec_set_map_layer(args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    layer = str(args.get("layer", "moisture")).lower()
    if layer not in LAYERS:
        return {"error": f"Unknown layer. Valid layers: {', '.join(LAYERS)}"}
    if ctx.current_path not in MAP_PAGES:
        ctx.actions.append({"type": "navigate", "path": "/twin"})
    ctx.actions.append({"type": "layer", "layer": layer})
    return {"layer": layer}


def _exec_select_zone(args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    zone_id = str(args.get("zoneId", "")).lower().replace(" ", "-")
    if zone_id not in ZONE_IDS:
        return {"error": f"Unknown zone. Valid zones: {', '.join(ZONE_IDS)}"}
    if ctx.current_path not in MAP_PAGES:
        ctx.actions.append({"type": "navigate", "path": "/twin"})
    ctx.actions.append({"type": "zone", "zoneId": zone_id})
    return {"selected": zone_id}


def _exec_open_simulator(args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    if ctx.current_path != "/simulator":
        ctx.actions.append({"type": "navigate", "path": "/simulator"})
    ctx.actions.append({"type": "simulate"})
    return {"opened": "/simulator", "simulationStarted": True}


def _exec_set_water_budget(args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    amount = int(args.get("amount", 2000))
    if ctx.current_path != "/water-budget":
        ctx.actions.append({"type": "navigate", "path": "/water-budget"})
    ctx.actions.append({"type": "optimize", "amount": amount})
    return {"budgetLitres": amount}


def _exec_toggle_sidebar(args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    ctx.actions.append({"type": "sidebar"})
    return {"toggled": True}


def _exec_refresh_data(args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    ctx.actions.append({"type": "refresh"})
    return {"refreshed": True}


# ---------------------------------------------------------------- registry

def _decl(name: str, description: str, properties: Dict[str, Any], required: List[str] = None) -> Dict[str, Any]:
    return {
        "name": name,
        "description": description,
        "parameters": {
            "type": "object",
            "properties": properties,
            "required": required or [],
        },
    }


DATA_TOOLS: Dict[str, Any] = {
    "get_field_state": {
        "decl": _decl(
            "get_field_state",
            "Digital twin state: root-zone moisture, field capacity, wilting point, stress risk, updated timestamp.",
            {},
        ),
        "execute": _exec_get_field_state,
    },
    "get_zones": {
        "decl": _decl(
            "get_zones",
            "All irrigation zones with moisture, stress risk, water requirement, NDVI, priority, soil type and area.",
            {},
        ),
        "execute": _exec_get_zones,
    },
    "get_weather": {
        "decl": _decl(
            "get_weather",
            "Live weather: current temperature, 48-hour forecast, rain probability and next rain event.",
            {},
        ),
        "execute": _exec_get_weather,
    },
    "get_sensors": {
        "decl": _decl(
            "get_sensors",
            "All IoT sensors with kind, zone, last reading and status.",
            {},
        ),
        "execute": _exec_get_sensors,
    },
    "get_history": {
        "decl": _decl(
            "get_history",
            "Recent irrigation decisions with dates, zones, water applied and reasons.",
            {},
        ),
        "execute": _exec_get_history,
    },
    "get_recommendation": {
        "decl": _decl(
            "get_recommendation",
            "AI irrigation recommendation: action, headline, reason, water saved, stress risk and confidence.",
            {},
        ),
        "execute": _exec_get_recommendation,
    },
    "get_system_status": {
        "decl": _decl(
            "get_system_status",
            "System health: sensor stream, weather connection, digital twin status.",
            {},
        ),
        "execute": _exec_get_system_status,
    },
    "get_water_fingerprint": {
        "decl": _decl(
            "get_water_fingerprint",
            "Soil hydraulic fingerprint: moisture retention, drying rate, irrigation and rain response.",
            {},
        ),
        "execute": _exec_get_water_fingerprint,
    },
    "run_simulation": {
        "decl": _decl(
            "run_simulation",
            "Run the 48-hour what-if simulation across all strategies (irrigate now, wait 3/6/12/24h, partial) and return the recommended scenario.",
            {
                "startPct": {"type": "number", "description": "Starting root-zone moisture percent (default 24.6)."},
                "horizonHours": {"type": "integer", "description": "Projection horizon in hours (default 48)."},
                "availableWaterL": {"type": "number", "description": "Available water in litres (default 2000)."},
            },
        ),
        "execute": _exec_run_simulation,
    },
    "run_rain_uncertainty": {
        "decl": _decl(
            "run_rain_uncertainty",
            "Rain-uncertainty analysis for a strategy: outcomes if rain occurs, partially occurs, or fails.",
            {
                "strategy": {
                    "type": "string",
                    "enum": ["now", "wait3", "wait6", "wait12", "wait24", "partial"],
                    "description": "Irrigation strategy to stress-test (default wait6).",
                },
            },
        ),
        "execute": _exec_run_rain_uncertainty,
    },
    "optimize_water": {
        "decl": _decl(
            "optimize_water",
            "Optimize the water budget: allocate available litres across zones by priority and need using OR-Tools.",
            {
                "availableWaterL": {
                    "type": "number",
                    "description": "Total water available in litres (default 2000).",
                },
            },
        ),
        "execute": _exec_optimize_water,
    },
}

CONTROL_TOOLS: Dict[str, Any] = {
    "navigate_to": {
        "decl": _decl(
            "navigate_to",
            f"Navigate the site to a page. Valid pages: {', '.join(PAGES)}.",
            {
                "path": {
                    "type": "string",
                    "enum": list(PAGES),
                    "description": "Page path to open.",
                },
            },
            ["path"],
        ),
        "execute": _exec_navigate_to,
    },
    "set_map_layer": {
        "decl": _decl(
            "set_map_layer",
            "Switch the field map layer. Valid layers: moisture, stress, ndvi, priority. Automatically navigates to the field twin map first if needed.",
            {
                "layer": {
                    "type": "string",
                    "enum": list(LAYERS),
                    "description": "Map layer to display.",
                },
            },
            ["layer"],
        ),
        "execute": _exec_set_map_layer,
    },
    "select_zone": {
        "decl": _decl(
            "select_zone",
            "Select a zone on the field map to inspect it. Valid zones: zone-a, zone-b, zone-c, zone-d.",
            {
                "zoneId": {
                    "type": "string",
                    "enum": list(ZONE_IDS),
                    "description": "Zone ID to select.",
                },
            },
            ["zoneId"],
        ),
        "execute": _exec_select_zone,
    },
    "open_simulator": {
        "decl": _decl(
            "open_simulator",
            "Open the what-if simulator page and start the simulation.",
            {},
        ),
        "execute": _exec_open_simulator,
    },
    "set_water_budget": {
        "decl": _decl(
            "set_water_budget",
            "Set the available water budget in litres on the water budget page and run the optimization.",
            {
                "amount": {
                    "type": "integer",
                    "description": "Available water in litres.",
                },
            },
            ["amount"],
        ),
        "execute": _exec_set_water_budget,
    },
    "toggle_sidebar": {
        "decl": _decl(
            "toggle_sidebar",
            "Toggle the navigation sidebar open or closed.",
            {},
        ),
        "execute": _exec_toggle_sidebar,
    },
    "refresh_data": {
        "decl": _decl(
            "refresh_data",
            "Refresh all field data, sensors, weather and recommendations.",
            {},
        ),
        "execute": _exec_refresh_data,
    },
}

ALL_DECLARATIONS = [tool["decl"] for tool in {**DATA_TOOLS, **CONTROL_TOOLS}.values()]


def _execute_tool(name: str, args: Dict[str, Any], ctx: AgentToolContext) -> Dict[str, Any]:
    tool = DATA_TOOLS.get(name) or CONTROL_TOOLS.get(name)
    if not tool:
        return {"error": f"Unknown tool: {name}"}
    try:
        if name in CONTROL_TOOLS:
            return tool["execute"](args, ctx)
        return tool["execute"](args)
    except Exception as exc:  # tool failures are recoverable — report to the model
        logger.warning(f"Agent tool {name} failed: {exc}")
        return {"error": f"Tool {name} failed: {exc}"}


# ---------------------------------------------------------------- gemini client

async def _call_gemini(contents: List[Dict[str, Any]]) -> Dict[str, Any]:
    url = f"{settings.GEMINI_BASE_URL.rstrip('/')}/models/{settings.GEMINI_MODEL}:generateContent"
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "tools": [{"functionDeclarations": ALL_DECLARATIONS}],
        "generationConfig": {"temperature": 0.35},
    }
    async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_S) as client:
        res = await client.post(url, params={"key": settings.GEMINI_API_KEY}, json=payload)
    if res.status_code != 200:
        logger.error(f"Gemini API error {res.status_code}: {res.text[:500]}")
        raise RuntimeError(f"Gemini API returned {res.status_code}")
    return res.json()


def _merge_consecutive(messages: List[AgentMessage]) -> List[Dict[str, Any]]:
    """Gemini expects alternating user/model turns — merge adjacent same-role messages."""
    contents: List[Dict[str, Any]] = []
    for m in messages:
        if m.role not in ("user", "agent"):
            continue
        role = "user" if m.role == "user" else "model"
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += "\n" + m.text
        else:
            contents.append({"role": role, "parts": [{"text": m.text}]})
    return contents


@router.post("/chat")
async def agent_chat(req: AgentChatRequest) -> dict:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="gemini_not_configured")

    ctx = AgentToolContext(req.currentPath)
    contents = _merge_consecutive(req.messages)
    if not contents:
        raise HTTPException(status_code=400, detail="empty_conversation")

    last_text = ""
    try:
        for _ in range(MAX_TOOL_ROUNDS):
            data = await _call_gemini(contents)
            candidates = data.get("candidates") or []
            parts = (candidates[0].get("content") or {}).get("parts") or []

            contents.append({"role": "model", "parts": parts})

            function_calls = [p["functionCall"] for p in parts if "functionCall" in p]
            text_parts = [p["text"] for p in parts if "text" in p]
            if text_parts:
                last_text = "\n".join(text_parts)

            if not function_calls:
                break

            for call in function_calls:
                name = call.get("name", "")
                args = call.get("args") or {}
                result = _execute_tool(name, args, ctx)
                contents.append(
                    {
                        "role": "function",
                        "parts": [
                            {"functionResponse": {"name": name, "response": {"result": result}}}
                        ],
                    }
                )
        else:
            logger.warning("Agent tool loop hit max rounds")
    except Exception as exc:
        logger.error(f"Agent loop failed: {exc}")
        raise HTTPException(status_code=502, detail="agent_backend_error")

    return {"text": last_text, "actions": ctx.actions}
