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


import sys
import uuid

def init_db(seed_test_fixtures: bool = False) -> None:
    """Initialize relational database tables for production or test environments."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS farms (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                name TEXT NOT NULL,
                country TEXT DEFAULT '',
                state_region TEXT DEFAULT '',
                district_city TEXT DEFAULT '',
                location TEXT NOT NULL,
                total_area REAL DEFAULT 0.0,
                preferred_unit TEXT DEFAULT 'ha',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fields (
                id TEXT PRIMARY KEY,
                farm_id TEXT NOT NULL,
                user_id TEXT,
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

        # Backward compatibility column migrations for existing SQLite file
        for col_name, col_type in [
            ("user_id", "TEXT"),
            ("country", "TEXT DEFAULT ''"),
            ("state_region", "TEXT DEFAULT ''"),
            ("district_city", "TEXT DEFAULT ''"),
            ("total_area", "REAL DEFAULT 0.0"),
            ("preferred_unit", "TEXT DEFAULT 'ha'"),
            ("updated_at", "TEXT"),
        ]:
            try:
                cursor.execute(f"ALTER TABLE farms ADD COLUMN {col_name} {col_type}")
            except sqlite3.OperationalError:
                pass

        try:
            cursor.execute("ALTER TABLE fields ADD COLUMN user_id TEXT")
        except sqlite3.OperationalError:
            pass

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

        # Clean demo data out of production runtime
        is_testing = seed_test_fixtures or ("unittest" in sys.modules and os.getenv("AQUATWIN_NO_TEST_SEED") != "1")
        if not is_testing:
            cursor.execute("DELETE FROM farms WHERE id = 'farm-srkr-demo'")
            cursor.execute("DELETE FROM fields WHERE farm_id = 'farm-srkr-demo'")
            cursor.execute("DELETE FROM zones WHERE field_id = 'field-a'")
            cursor.execute("DELETE FROM sensors WHERE field_id = 'field-a'")
            cursor.execute("DELETE FROM irrigation_history WHERE field_id = 'field-a'")
            cursor.execute("DELETE FROM field_twin_state WHERE field_id = 'field-a'")
        else:
            cursor.execute("SELECT COUNT(*) FROM farms WHERE id = 'farm-srkr-demo'")
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

def get_farms(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        if user_id:
            rows = conn.execute("SELECT * FROM farms WHERE user_id = ? ORDER BY created_at ASC", (user_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM farms ORDER BY created_at ASC").fetchall()
        farms = []
        for r in rows:
            farm_dict = dict(r)
            farm_dict["userId"] = farm_dict.get("user_id")
            farm_dict["totalArea"] = farm_dict.get("total_area", 0.0)
            farm_dict["preferredUnit"] = farm_dict.get("preferred_unit", "ha")
            farm_dict["country"] = farm_dict.get("country", "")
            farm_dict["stateRegion"] = farm_dict.get("state_region", "")
            farm_dict["districtCity"] = farm_dict.get("district_city", "")
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
        farm_dict["userId"] = farm_dict.get("user_id")
        farm_dict["totalArea"] = farm_dict.get("total_area", 0.0)
        farm_dict["preferredUnit"] = farm_dict.get("preferred_unit", "ha")
        farm_dict["country"] = farm_dict.get("country", "")
        farm_dict["stateRegion"] = farm_dict.get("state_region", "")
        farm_dict["districtCity"] = farm_dict.get("district_city", "")
        farm_dict["fields"] = get_fields_by_farm(farm_id)
        return farm_dict


def save_user_farm(farm_data: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        farm_id = farm_data.get("id") or f"farm-{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        name = (farm_data.get("name") or "My Farm").strip()
        country = (farm_data.get("country") or "").strip()
        state_region = (farm_data.get("stateRegion") or farm_data.get("state_region") or "").strip()
        district_city = (farm_data.get("districtCity") or farm_data.get("district_city") or "").strip()
        location = (farm_data.get("location") or f"{district_city}, {state_region}, {country}".strip(", ")).strip()
        if not location:
            location = "Location not set"
        total_area = float(farm_data.get("totalArea") or farm_data.get("total_area") or 0.0)
        preferred_unit = farm_data.get("preferredUnit") or farm_data.get("preferred_unit") or "ha"

        cursor.execute("""
            INSERT INTO farms (
                id, user_id, name, country, state_region, district_city,
                location, total_area, preferred_unit, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                country=excluded.country,
                state_region=excluded.state_region,
                district_city=excluded.district_city,
                location=excluded.location,
                total_area=excluded.total_area,
                preferred_unit=excluded.preferred_unit,
                updated_at=excluded.updated_at
        """, (
            farm_id, user_id, name, country, state_region, district_city,
            location, total_area, preferred_unit, now_str, now_str,
        ))

        # First field configuration
        field_id = farm_data.get("fieldId") or f"field-{uuid.uuid4().hex[:12]}"
        field_name = (farm_data.get("fieldName") or farm_data.get("field_name") or f"{name} Plot 1").strip()
        field_area = float(farm_data.get("fieldArea") or farm_data.get("field_area") or total_area)
        crop_name = (farm_data.get("cropType") or farm_data.get("crop_name") or "Crop not configured").strip()
        crop_variety = (farm_data.get("cropVariety") or farm_data.get("crop_variety") or "").strip()
        crop_stage = (farm_data.get("growthStage") or farm_data.get("crop_stage") or "").strip()
        sowing_date = (farm_data.get("plantingDate") or farm_data.get("sowing_date") or "").strip()
        boundary = farm_data.get("boundary") or farm_data.get("geometry") or {}

        kc_map = {"Rice": 1.15, "Wheat": 1.05, "Maize / Corn": 1.10, "Cotton": 1.15, "Sugarcane": 1.25, "Tomato": 1.05, "Soybean": 1.05}
        crop_kc = kc_map.get(crop_name, 1.0)

        cursor.execute("""
            INSERT INTO fields (
                id, farm_id, user_id, name, area_ha, crop_name, crop_variety,
                crop_stage, sowing_date, crop_kc, soil_texture, geometry_json,
                latitude, longitude, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                area_ha=excluded.area_ha,
                crop_name=excluded.crop_name,
                crop_variety=excluded.crop_variety,
                crop_stage=excluded.crop_stage,
                sowing_date=excluded.sowing_date,
                crop_kc=excluded.crop_kc
        """, (
            field_id, farm_id, user_id, field_name, field_area, crop_name, crop_variety,
            crop_stage, sowing_date, crop_kc, "Loam", json.dumps(boundary),
            None, None, now_str,
        ))

        conn.commit()
        return get_farm(farm_id) or {"id": farm_id, "name": name, "user_id": user_id}


def update_user_farm(farm_id: str, updates: Dict[str, Any], user_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        existing = cursor.execute("SELECT * FROM farms WHERE id = ? AND (user_id = ? OR user_id IS NULL)", (farm_id, user_id)).fetchone()
        if not existing:
            return None

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        name = updates.get("name", existing["name"]).strip()
        country = updates.get("country", existing["country"] if "country" in existing.keys() else "").strip()
        state_region = updates.get("stateRegion", updates.get("state_region", existing["state_region"] if "state_region" in existing.keys() else "")).strip()
        district_city = updates.get("districtCity", updates.get("district_city", existing["district_city"] if "district_city" in existing.keys() else "")).strip()
        location = updates.get("location", existing["location"]).strip()
        total_area = float(updates.get("totalArea", updates.get("total_area", existing["total_area"] if "total_area" in existing.keys() else 0.0)))
        preferred_unit = updates.get("preferredUnit", updates.get("preferred_unit", existing["preferred_unit"] if "preferred_unit" in existing.keys() else "ha"))

        cursor.execute("""
            UPDATE farms SET
                name = ?,
                country = ?,
                state_region = ?,
                district_city = ?,
                location = ?,
                total_area = ?,
                preferred_unit = ?,
                updated_at = ?
            WHERE id = ? AND (user_id = ? OR user_id IS NULL)
        """, (name, country, state_region, district_city, location, total_area, preferred_unit, now_str, farm_id, user_id))

        if "cropType" in updates or "crop_name" in updates or "fieldName" in updates or "field_name" in updates:
            crop_name = updates.get("cropType") or updates.get("crop_name")
            crop_variety = updates.get("cropVariety") or updates.get("crop_variety")
            crop_stage = updates.get("growthStage") or updates.get("crop_stage")
            field_name = updates.get("fieldName") or updates.get("field_name")
            cursor.execute("""
                UPDATE fields SET
                    crop_name = COALESCE(?, crop_name),
                    crop_variety = COALESCE(?, crop_variety),
                    crop_stage = COALESCE(?, crop_stage),
                    name = COALESCE(?, name)
                WHERE farm_id = ?
            """, (crop_name, crop_variety, crop_stage, field_name, farm_id))

        conn.commit()
        return get_farm(farm_id)


def delete_user_farm(farm_id: str, user_id: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM farms WHERE id = ? AND (user_id = ? OR user_id IS NULL)", (farm_id, user_id))
        deleted = cursor.rowcount > 0
        if deleted:
            cursor.execute("DELETE FROM fields WHERE farm_id = ?", (farm_id,))
        conn.commit()
        return deleted



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
