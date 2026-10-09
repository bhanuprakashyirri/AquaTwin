"""SQLite database initialization and persistence layer for AquaTwin."""

import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
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

        # Auto-seed default farm records if database has no registered farms
        cursor.execute("SELECT COUNT(*) FROM farms")
        if cursor.fetchone()[0] == 0:
            _seed_default_farm(cursor)

        conn.commit()


def _seed_default_farm(cursor: sqlite3.Cursor) -> None:
    """Seed the default Bhimavaram field model, zones, sensors and telemetry history."""
    now_str = "2026-09-01T00:00:00Z"
    cursor.execute(
        "INSERT INTO farms (id, name, location, created_at) VALUES (?, ?, ?, ?)",
        ("farm-srkr-demo", "Kisan Bhimavaram Demo Farm", "Bhimavaram, Andhra Pradesh, India", now_str),
    )

    lon, lat = 81.5212, 16.5449
    def _offset(dlon: float, dlat: float) -> list:
        return [round(lon + dlon, 6), round(lat + dlat, 6)]

    field_geom = {
        "type": "Polygon",
        "coordinates": [[
            _offset(-0.0018, -0.0013),
            _offset(0.0018, -0.0013),
            _offset(0.0018, 0.0013),
            _offset(-0.0018, 0.0013),
            _offset(-0.0018, -0.0013),
        ]],
    }

    cursor.execute("""
        INSERT INTO fields (
            id, farm_id, name, area_ha, crop_name, crop_variety, crop_stage,
            sowing_date, crop_kc, soil_texture, geometry_json, latitude, longitude, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "field-a", "farm-srkr-demo", "North Plot — Paddy/Rice Rotation", 10.0,
        "Rice", "MTU-7029 (Swarna)", "Reproductive — panicle initiation",
        "2026-08-02", 1.12, "Sandy loam to clay loam", json.dumps(field_geom),
        lat, lon, now_str,
    ))

    zone_geoms = {
        "zone-a": {"type": "Polygon", "coordinates": [[
            _offset(-0.0018, -0.0013), _offset(0.00005, -0.0013),
            _offset(0.00005, -0.00002), _offset(-0.0018, -0.00002),
            _offset(-0.0018, -0.0013),
        ]]},
        "zone-b": {"type": "Polygon", "coordinates": [[
            _offset(0.00005, -0.00002), _offset(0.0018, -0.00002),
            _offset(0.0018, 0.0013), _offset(0.00005, 0.0013),
            _offset(0.00005, -0.00002),
        ]]},
        "zone-c": {"type": "Polygon", "coordinates": [[
            _offset(0.00005, -0.0013), _offset(0.0018, -0.0013),
            _offset(0.0018, -0.00002), _offset(0.00005, -0.00002),
            _offset(0.00005, -0.0013),
        ]]},
        "zone-d": {"type": "Polygon", "coordinates": [[
            _offset(-0.0018, -0.00002), _offset(0.00005, -0.00002),
            _offset(0.00005, 0.0013), _offset(-0.0018, 0.0013),
            _offset(-0.0018, -0.00002),
        ]]},
    }

    zones = [
        ("zone-a", "field-a", "Zone A", 3.0, "Sandy loam", json.dumps(zone_geoms["zone-a"]), 26.4, 9.0, 400.0, "Medium", 30.0, 0.62, 4),
        ("zone-b", "field-a", "Zone B", 3.0, "Clay loam", json.dumps(zone_geoms["zone-b"]), 21.8, 22.0, 900.0, "Medium", 18.0, 0.58, 1),
        ("zone-c", "field-a", "Zone C", 2.0, "Sandy loam", json.dumps(zone_geoms["zone-c"]), 25.6, 12.0, 600.0, "High", 41.0, 0.66, 3),
        ("zone-d", "field-a", "Zone D", 2.0, "Loam", json.dumps(zone_geoms["zone-d"]), 23.2, 18.0, 800.0, "Medium", 24.0, 0.60, 2),
    ]
    cursor.executemany("""
        INSERT INTO zones (
            id, field_id, name, area_ha, soil_type, geometry_json,
            moisture_pct, stress_risk_pct, water_requirement_l, rain_exposure,
            last_irrigated_hours_ago, ndvi, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, zones)

    sensors = [
        ("s1", "zone-a", "field-a", "soil_moisture", json.dumps({"type": "Point", "coordinates": _offset(-0.0012, 0.0006)}), 30, 27.4, now_str, "live"),
        ("s2", "zone-a", "field-a", "temperature", json.dumps({"type": "Point", "coordinates": _offset(-0.0006, -0.0006)}), None, 31.2, now_str, "live"),
        ("s3", "zone-b", "field-a", "soil_moisture", json.dumps({"type": "Point", "coordinates": _offset(0.0009, 0.0006)}), 30, 21.8, now_str, "live"),
        ("s4", "zone-b", "field-a", "temperature", json.dumps({"type": "Point", "coordinates": _offset(0.0009, -0.0006)}), None, 32.1, now_str, "live"),
        ("s5", "zone-c", "field-a", "soil_moisture", json.dumps({"type": "Point", "coordinates": _offset(-0.0012, -0.0006)}), 30, 26.1, now_str, "live"),
        ("s6", "zone-c", "field-a", "temperature", json.dumps({"type": "Point", "coordinates": _offset(-0.0006, 0.0006)}), None, 30.6, now_str, "live"),
        ("s7", "zone-d", "field-a", "soil_moisture", json.dumps({"type": "Point", "coordinates": _offset(0.0009, -0.0006)}), 30, 23.5, now_str, "live"),
        ("s8", "zone-d", "field-a", "rain_gauge", json.dumps({"type": "Point", "coordinates": _offset(-0.0006, 0.0)}), None, 0.0, now_str, "live"),
    ]
    cursor.executemany("""
        INSERT INTO sensors (
            id, zone_id, field_id, kind, coordinates_json, depth_cm, last_value, last_reading_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sensors)

    cursor.execute("""
        INSERT INTO field_twin_state (
            field_id, root_zone_moisture_pct, soil_moisture_10cm_pct, soil_moisture_30cm_pct,
            field_capacity_pct, wilting_point_pct, stress_risk_pct, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, ("field-a", 24.6, 22.8, 26.4, 34.0, 14.0, 12.0, now_str))

    decisions = [
        ("Irrigated", "High stress risk"), ("Waited", "Rain probability above threshold"),
        ("Irrigated", "Root-zone below refill point"), ("Partial", "Pre-rain deficit irrigation"),
        ("Irrigated", "Forecast dry window 48h"), ("Waited", "Moisture above MAD threshold"),
        ("Irrigated", "Flowering stage demand peak"), ("Waited", "Effective rainfall received"),
    ]
    history_rows = []
    base_dt = datetime(2026, 9, 29, 9, 41, 0, tzinfo=timezone.utc)
    for i in range(24):
        t = base_dt - timedelta(days=(i // 2) + 1, hours=(i % 2) * 7)
        dec, reason = decisions[i % len(decisions)]
        z_name = ["Zone A", "Zone B", "Zone C", "Zone D"][i % 4]
        pred = [400.0, 900.0, 600.0, 800.0][i % 4]
        applied = 0.0 if dec == "Waited" else round(pred * 0.6) if dec == "Partial" else pred
        resp = 1.5 if dec == "Waited" else 8.0 if dec == "Partial" else 13.5
        history_rows.append((
            f"hist-{i+1}", "field-a", t.isoformat().replace("+00:00", "Z"),
            z_name, applied, pred, resp, dec, reason,
        ))
    cursor.executemany("""
        INSERT INTO irrigation_history (
            id, field_id, date, zone, applied_water_l, predicted_requirement_l,
            moisture_response_pct, decision, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, history_rows)


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
            z["waterRequirementL"] = z.get("water_requirement_l", 0.0)
            z["needL"] = z.get("water_requirement_l", 0.0)
            z["moisturePct"] = z.get("moisture_pct", 0.0)
            z["stressRiskPct"] = z.get("stress_risk_pct", 0.0)
            z["soilType"] = z.get("soil_type", "")
            z["rainExposure"] = z.get("rain_exposure", "")
            z["lastIrrigatedHoursAgo"] = z.get("last_irrigated_hours_ago", 0.0)
            z["areaHa"] = z.get("area_ha", 0.0)
            zones.append(z)
        return zones


def get_sensors(field_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM sensors WHERE field_id = ?", (field_id,)).fetchall()
        sensors = []
        for r in rows:
            s = dict(r)
            s["position"] = json.loads(s["coordinates_json"])
            s["lastValue"] = s.get("last_value", 0.0)
            s["zoneId"] = s.get("zone_id")
            s["fieldId"] = s.get("field_id")
            s["depthCm"] = s.get("depth_cm")
            s["lastReadingAt"] = s.get("last_reading_at")
            sensors.append(s)
        return sensors


def get_irrigation_history(field_id: str) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT * FROM irrigation_history WHERE field_id = ? ORDER BY date DESC", (field_id,)).fetchall()
        events = []
        for r in rows:
            ev = dict(r)
            ev["appliedWaterL"] = ev.get("applied_water_l", 0.0)
            ev["predictedRequirementL"] = ev.get("predicted_requirement_l", 0.0)
            ev["moistureResponsePct"] = ev.get("moisture_response_pct", 0.0)
            events.append(ev)
        return events


def get_field_state(field_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM field_twin_state WHERE field_id = ?", (field_id,)).fetchone()
        if not row:
            return None
        st = dict(row)
        st["rootZoneMoisturePct"] = st.get("root_zone_moisture_pct", 0.0)
        st["soilMoisture10cmPct"] = st.get("soil_moisture_10cm_pct", 0.0)
        st["soilMoisture30cmPct"] = st.get("soil_moisture_30cm_pct", 0.0)
        st["fieldCapacityPct"] = st.get("field_capacity_pct", 34.0)
        st["wiltingPointPct"] = st.get("wilting_point_pct", 14.0)
        st["stressRiskPct"] = st.get("stress_risk_pct", 0.0)
        st["updatedAt"] = st.get("updated_at")
        return st


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
