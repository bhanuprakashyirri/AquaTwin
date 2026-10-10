"""Field Twin endpoints — database-backed geometry, telemetry, and live WebSocket streaming."""

import asyncio
import json
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.db.database import (
    get_field,
    get_field_state,
    get_zones,
    get_sensors,
)
from app.services.adapters import (
    CopernicusSatelliteProvider,
    DatabaseSensorProvider,
)
from app.services.twin import now_iso

router = APIRouter(tags=["field_twin"])

_satellite = CopernicusSatelliteProvider()
_sensors = DatabaseSensorProvider()


@router.get("/fields/{field_id}")
def get_field_by_id(field_id: str) -> dict:
    f = get_field(field_id)
    if not f:
        raise HTTPException(status_code=404, detail="Field not found")
    return f


@router.get("/fields/{field_id}/state")
def field_state(field_id: str) -> dict:
    s = get_field_state(field_id)
    if not s:
        return {
            "fieldId": field_id,
            "rootZoneMoisturePct": 24.5,
            "soilMoisture10cmPct": 23.0,
            "soilMoisture30cmPct": 26.0,
            "fieldCapacityPct": 32.0,
            "wiltingPointPct": 14.0,
            "stressRiskPct": 0.0,
            "updatedAt": now_iso(),
            "telemetryStatus": "uncalibrated",
        }
    return {
        "fieldId": s["field_id"],
        "rootZoneMoisturePct": s.get("root_zone_moisture_pct", 24.5),
        "soilMoisture10cmPct": s.get("soil_moisture_10cm_pct"),
        "soilMoisture30cmPct": s.get("soil_moisture_30cm_pct"),
        "fieldCapacityPct": s.get("field_capacity_pct", 32.0),
        "wiltingPointPct": s.get("wilting_point_pct", 14.0),
        "stressRiskPct": s.get("stress_risk_pct", 0.0),
        "updatedAt": s.get("updated_at", now_iso()),
    }


@router.get("/fields/{field_id}/zones")
def field_zones(field_id: str) -> dict:
    zones = get_zones(field_id)
    zone_states = [
        {
            "zoneId": z["id"],
            "moisturePct": z.get("moisture_pct", 0.0),
            "stressRiskPct": z.get("stress_risk_pct", 0.0),
            "waterRequirementL": z.get("water_requirement_l", 0.0),
            "confidencePct": 90 if z.get("moisture_pct") else 0,
        }
        for z in zones
    ]
    return {"zones": zones, "zoneStates": zone_states}


@router.get("/fields/{field_id}/satellite")
def field_satellite(field_id: str) -> dict:
    return _satellite.get_series(field_id)


@router.get("/fields/{field_id}/sensors")
def field_sensors(field_id: str) -> dict:
    sensors = _sensors.get_sensors_for_field(field_id)
    return {
        "source": _sensors.source_label,
        "sensors": sensors,
    }


@router.websocket("/ws/field/{field_id}")
async def ws_field(websocket: WebSocket, field_id: str) -> None:
    await websocket.accept()
    step = 0
    try:
        while True:
            sensors = get_sensors(field_id)
            if sensors:
                frame = {
                    "type": "sensor_frame",
                    "step": step,
                    "timestamp": now_iso(),
                    "source": "IoT Sensor Network",
                    "sensors": sensors,
                }
            else:
                frame = {
                    "type": "telemetry_status",
                    "step": step,
                    "timestamp": now_iso(),
                    "status": "offline",
                    "message": "No live IoT sensors enrolled for this field.",
                    "sensors": [],
                }
            await websocket.send_text(json.dumps(frame))
            step += 1
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        return
