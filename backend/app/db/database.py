"""SQLite database initialization and persistence layer for AquaTwin."""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "aquatwin.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize relational database tables."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS farms (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fields (
                id TEXT PRIMARY KEY,
                farm_id TEXT NOT NULL,
                name TEXT NOT NULL,
                area_ha REAL NOT NULL,
                crop_name TEXT NOT NULL,
                crop_variety TEXT NOT NULL,
                crop_stage TEXT NOT NULL,
                sowing_date TEXT NOT NULL,
                crop_kc REAL NOT NULL,
                soil_texture TEXT NOT NULL,
                geometry_json TEXT NOT NULL,
                latitude REAL,
                longitude REAL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (farm_id) REFERENCES farms (id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS zones (
                id TEXT PRIMARY KEY,
                field_id TEXT NOT NULL,
                name TEXT NOT NULL,
                area_ha REAL NOT NULL,
                soil_type TEXT NOT NULL,
                geometry_json TEXT NOT NULL,
                moisture_pct REAL,
                stress_risk_pct REAL,
                water_requirement_l REAL,
                rain_exposure TEXT,
                last_irrigated_hours_ago REAL,
                ndvi REAL,
                priority INTEGER,
                FOREIGN KEY (field_id) REFERENCES fields (id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensors (
                id TEXT PRIMARY KEY,
                zone_id TEXT NOT NULL,
                field_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                coordinates_json TEXT NOT NULL,
                depth_cm INTEGER,
                last_value REAL,
                last_reading_at TEXT,
                status TEXT NOT NULL,
                FOREIGN KEY (zone_id) REFERENCES zones (id),
                FOREIGN KEY (field_id) REFERENCES fields (id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS irrigation_history (
                id TEXT PRIMARY KEY,
                field_id TEXT NOT NULL,
                date TEXT NOT NULL,
                zone TEXT NOT NULL,
                applied_water_l REAL NOT NULL,
                predicted_requirement_l REAL NOT NULL,
                moisture_response_pct REAL,
                decision TEXT NOT NULL,
                reason TEXT NOT NULL,
                FOREIGN KEY (field_id) REFERENCES fields (id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS field_twin_state (
                field_id TEXT PRIMARY KEY,
                root_zone_moisture_pct REAL NOT NULL,
                soil_moisture_10cm_pct REAL,
                soil_moisture_30cm_pct REAL,
                field_capacity_pct REAL NOT NULL,
                wilting_point_pct REAL NOT NULL,
                stress_risk_pct REAL NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (field_id) REFERENCES fields (id)
            )
        """)

        conn.commit()


# ---------------------------------------------------------------- Data access

def get_farms() -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM farms ORDER BY created_at ASC").fetchall()
        farms = []
        for r in rows:
            farm_dict = dict(r)
            fields = get_fields_by_farm(farm_dict["id"])
            farm_dict["fields"] = fields
            farms.append(farm_dict)
        return farms


def get_farm(farm_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM farms WHERE id = ?", (farm_id,)).fetchone()
        if not row:
            return None
        farm_dict = dict(row)
        farm_dict["fields"] = get_fields_by_farm(farm_id)
        return farm_dict


def get_fields_by_farm(farm_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM fields WHERE farm_id = ?", (farm_id,)).fetchall()
        fields = []
        for r in rows:
            f = dict(r)
            f["geometry"] = json.loads(f["geometry_json"])
            f["crop"] = {
                "name": f["crop_name"],
                "variety": f["crop_variety"],
                "growthStage": f["crop_stage"],
                "daysAfterSowing": 0,
                "cropCoefficient": f["crop_kc"],
            }
            fields.append(f)
        return fields


def get_field(field_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM fields WHERE id = ?", (field_id,)).fetchone()
        if not row:
            return None
        f = dict(row)
        f["geometry"] = json.loads(f["geometry_json"])
        f["crop"] = {
            "name": f["crop_name"],
            "variety": f["crop_variety"],
            "growthStage": f["crop_stage"],
            "daysAfterSowing": 0,
            "cropCoefficient": f["crop_kc"],
        }
        return f


def get_zones(field_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM zones WHERE field_id = ? ORDER BY priority ASC", (field_id,)).fetchall()
        zones = []
        for r in rows:
            z = dict(r)
            z["geometry"] = json.loads(z["geometry_json"])
            zones.append(z)
        return zones


def get_sensors(field_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM sensors WHERE field_id = ?", (field_id,)).fetchall()
        sensors = []
        for r in rows:
            s = dict(r)
            s["position"] = json.loads(s["coordinates_json"])
            sensors.append(s)
        return sensors


def get_irrigation_history(field_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM irrigation_history WHERE field_id = ? ORDER BY date DESC", (field_id,)).fetchall()
        return [dict(r) for r in rows]


def get_field_state(field_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM field_twin_state WHERE field_id = ?", (field_id,)).fetchone()
        return dict(row) if row else None


def update_field_state(field_id: str, state: Dict[str, Any]) -> None:
    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO field_twin_state (
                field_id, root_zone_moisture_pct, soil_moisture_10cm_pct, soil_moisture_30cm_pct,
                field_capacity_pct, wilting_point_pct, stress_risk_pct, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(field_id) DO UPDATE SET
                root_zone_moisture_pct = excluded.root_zone_moisture_pct,
                soil_moisture_10cm_pct = excluded.soil_moisture_10cm_pct,
                soil_moisture_30cm_pct = excluded.soil_moisture_30cm_pct,
                field_capacity_pct = excluded.field_capacity_pct,
                wilting_point_pct = excluded.wilting_point_pct,
                stress_risk_pct = excluded.stress_risk_pct,
                updated_at = excluded.updated_at
        """, (
            field_id,
            state["rootZoneMoisturePct"],
            state.get("soilMoisture10cmPct"),
            state.get("soilMoisture30cmPct"),
            state["fieldCapacityPct"],
            state["wiltingPointPct"],
            state["stressRiskPct"],
            now_str,
        ))
        conn.commit()
