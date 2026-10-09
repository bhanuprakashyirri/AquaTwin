"""Field Twin endpoints — field geometry, state, zones, satellite, sensors, and telemetry websocket."""

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.adapters import (
    DemoSatelliteProvider,
    DemoSensorProvider,
)
from app.services.demo_data import (
    FIELD,
    ZONES,
    now_iso,
)
from app.services.twin import (
    DigitalTwinService,
)

router = APIRouter(tags=["field_twin"])

_satellite = DemoSatelliteProvider()
_sensors = DemoSensorProvider()
_twin = DigitalTwinService()


@router.get("/fields/{field_id}")
def get_field(field_id: str) -> dict:
    return FIELD


@router.get("/fields/{field_id}/state")
def field_state(field_id: str) -> dict:
    return _twin.get_state(field_id)


@router.get("/fields/{field_id}/zones")
def field_zones(field_id: str) -> dict:
    return {"zones": ZONES, "zoneStates": _twin.zones_state()}


@router.get("/fields/{field_id}/satellite")
def field_satellite(field_id: str) -> dict:
    return {"source": _satellite.source_label, "series": _satellite.get_series()}


@router.get("/fields/{field_id}/sensors")
def field_sensors(field_id: str) -> dict:
    return {"source": _sensors.source_label, "sensors": _sensors.get_sensors()}


@router.websocket("/ws/field/{field_id}")
async def ws_field(websocket: WebSocket, field_id: str) -> None:
    await websocket.accept()
    step = 0
    try:
        while True:
            frame = {
                "type": "sensor_frame",
                "step": step,
                "timestamp": now_iso(),
                "source": _sensors.source_label,
                "sensors": _sensors.tick(step),
            }
            await websocket.send_text(json.dumps(frame))
            step += 1
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        return
