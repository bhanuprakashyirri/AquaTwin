"""Seeded demo data — deterministic, realistic, zero external dependencies."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np

_rng = np.random.default_rng(42)

NOW = datetime(2026, 9, 29, 9, 41, 0, tzinfo=timezone.utc)  # fixed demo "now"


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def now_iso() -> str:
    return iso(NOW)


# ---------------------------------------------------------------- geo
# Realistic placement: coastal Andhra Pradesh, India (near Bhimavaram).
# Not an actual customer's farm — demo geography.

FIELD_CENTER = (16.5449, 81.5212)  # (lat, lon)

def _offset(lon: float, lat: float, dlon: float, dlat: float) -> list:
    return [round(lon + dlon, 6), round(lat + dlat, 6)]


LON, LAT = 81.5212, 16.5449
# ~340m x 300m field (approx 10 ha)
FIELD_GEOM = {
    "type": "Polygon",
    "coordinates": [[
        _offset(LON, LAT, -0.0018, -0.0013),
        _offset(LON, LAT, 0.0018, -0.0013),
        _offset(LON, LAT, 0.0018, 0.0013),
        _offset(LON, LAT, -0.0018, 0.0013),
        _offset(LON, LAT, -0.0018, -0.0013),
    ]],
}

ZONE_GEOMS = {
    "zone-a": {"type": "Polygon", "coordinates": [[
        _offset(LON, LAT, -0.0018, -0.0013), _offset(LON, LAT, 0.00005, -0.0013),
        _offset(LON, LAT, 0.00005, -0.00002), _offset(LON, LAT, -0.0018, -0.00002),
        _offset(LON, LAT, -0.0018, -0.0013),
    ]]},
    "zone-b": {"type": "Polygon", "coordinates": [[
        _offset(LON, LAT, 0.00005, -0.00002), _offset(LON, LAT, 0.0018, -0.00002),
        _offset(LON, LAT, 0.0018, 0.0013), _offset(LON, LAT, 0.00005, 0.0013),
        _offset(LON, LAT, 0.00005, -0.00002),
    ]]},
    "zone-c": {"type": "Polygon", "coordinates": [[
        _offset(LON, LAT, 0.00005, -0.0013), _offset(LON, LAT, 0.0018, -0.0013),
        _offset(LON, LAT, 0.0018, -0.00002), _offset(LON, LAT, 0.00005, -0.00002),
        _offset(LON, LAT, 0.00005, -0.0013),
    ]]},
    "zone-d": {"type": "Polygon", "coordinates": [[
        _offset(LON, LAT, -0.0018, -0.00002), _offset(LON, LAT, 0.00005, -0.00002),
        _offset(LON, LAT, 0.00005, 0.0013), _offset(LON, LAT, -0.0018, 0.0013),
        _offset(LON, LAT, -0.0018, -0.00002),
    ]]},
}


def _sensor(sid: str, zone: str, kind: str, dlon: float, dlat: float, val: float, depth: int | None = None) -> dict:
    return {
        "id": sid,
        "zoneId": zone,
        "kind": kind,
        "position": {"type": "Point", "coordinates": _offset(LON, LAT, dlon, dlat)},
        "depthCm": depth,
        "lastValue": val,
        "lastReadingAt": iso(NOW - timedelta(minutes=int(_rng.integers(1, 5)))),
        "status": "demo",
    }


SENSORS = [
    _sensor("s1", "zone-a", "soil_moisture", -0.0012, 0.0006, 27.4, 30),
    _sensor("s2", "zone-a", "temperature", -0.0006, -0.0006, 31.2),
    _sensor("s3", "zone-b", "soil_moisture", 0.0009, 0.0006, 21.8, 30),
    _sensor("s4", "zone-b", "temperature", 0.0009, -0.0006, 32.1),
    _sensor("s5", "zone-c", "soil_moisture", -0.0012, -0.0006, 26.1, 30),
    _sensor("s6", "zone-c", "temperature", -0.0006, 0.0006, 30.6),
    _sensor("s7", "zone-d", "soil_moisture", 0.0009, -0.0006, 23.5, 30),
    _sensor("s8", "zone-d", "rain_gauge", -0.0006, 0.0000, 0.0),
]

ZONES = [
    {
        "id": "zone-a", "name": "Zone A", "areaHa": 3.0, "soilType": "Sandy loam",
        "geometry": ZONE_GEOMS["zone-a"],
        "moisturePct": 26.4, "stressRiskPct": 9, "waterRequirementL": 400,
        "rainExposure": "Medium", "lastIrrigatedHoursAgo": 30.0, "ndvi": 0.62, "priority": 4,
    },
    {
        "id": "zone-b", "name": "Zone B", "areaHa": 3.0, "soilType": "Clay loam",
        "geometry": ZONE_GEOMS["zone-b"],
        "moisturePct": 21.8, "stressRiskPct": 22, "waterRequirementL": 900,
        "rainExposure": "Medium", "lastIrrigatedHoursAgo": 18.0, "ndvi": 0.58, "priority": 1,
    },
    {
        "id": "zone-c", "name": "Zone C", "areaHa": 2.0, "soilType": "Sandy loam",
        "geometry": ZONE_GEOMS["zone-c"],
        "moisturePct": 25.6, "stressRiskPct": 12, "waterRequirementL": 600,
        "rainExposure": "High", "lastIrrigatedHoursAgo": 41.0, "ndvi": 0.66, "priority": 3,
    },
    {
        "id": "zone-d", "name": "Zone D", "areaHa": 2.0, "soilType": "Loam",
        "geometry": ZONE_GEOMS["zone-d"],
        "moisturePct": 23.2, "stressRiskPct": 18, "waterRequirementL": 800,
        "rainExposure": "Medium", "lastIrrigatedHoursAgo": 24.0, "ndvi": 0.6, "priority": 2,
    },
]

FIELD = {
    "id": "field-a",
    "name": "North Plot — Paddy/Rice Rotation",
    "areaHa": 10.0,
    "crop": {
        "name": "Rice", "variety": "MTU-7029 (Swarna)",
        "growthStage": "Reproductive — panicle initiation",
        "daysAfterSowing": 58,
        "cropCoefficient": 1.12,
    },
    "geometry": FIELD_GEOM,
    "sowingDate": "2026-08-02",
    "soilTexture": "Sandy loam to clay loam",
}

FARM = {
    "id": "farm-srkr-demo",
    "name": "Kisan Bhimavaram Demo Farm",
    "location": "Bhimavaram, Andhra Pradesh, India",
    "fields": [FIELD],
}

# ---------------------------------------------------------------- weather
# Deterministic 48h forecast + 7d observations, FAO-56-plausible magnitudes.


def _forecast(hours: int = 48) -> list:
    out = []
    for h in range(hours):
        t = NOW + timedelta(hours=h)
        diurnal = np.sin((t.hour - 6) / 24 * 2 * np.pi)
        temp = 27.5 + 4.5 * diurnal + 0.01 * h
        humidity = 72 - 12 * diurnal + 2 * np.sin(h / 7)
        rain = 0.0
        prob = 0.0
        # monsoon shoulder-season pattern: modest rain window between h=6..12
        if 6 <= h <= 12:
            prob = int(78 - 8 * (h - 6))
            rain = 3.5 * np.exp(-((h - 9) ** 2) / 4)
        elif 24 <= h <= 30:
            prob = int(45 - 5 * (h - 24))
            rain = 2.0 * np.exp(-((h - 27) ** 2) / 4)
        else:
            prob = int(10 + 8 * np.sin(h))
        out.append({
            "time": iso(t),
            "temperatureC": round(float(temp), 1),
            "humidityPct": round(float(min(max(humidity, 30), 98)), 0),
            "windKph": round(float(8 + 3 * np.sin(h / 5)), 1),
            "solarRadMJm2": round(float(max(0, 22 * np.sin((t.hour - 6) / 12 * np.pi))), 1),
            "rainfallMm": round(float(rain), 2),
            "rainProbabilityPct": max(5, prob),
        })
    return out


FORECAST_48H = _forecast()


def _observations(days: int = 7) -> list:
    out = []
    for d in range(days, 0, -1):
        for h in [6, 9, 12, 15, 18]:
            t = NOW - timedelta(days=d) + timedelta(hours=h)
            temp = 27.0 + 4.0 * np.sin((h - 6) / 12 * np.pi)
            rain = float(_rng.integers(0, 4)) if _rng.random() < 0.25 else 0.0
            out.append({
                "time": iso(t),
                "temperatureC": round(float(temp + _rng.normal(0, 0.4)), 1),
                "humidityPct": round(float(70 + _rng.normal(0, 4)), 0),
                "windKph": round(float(9 + _rng.normal(0, 2)), 1),
                "solarRadMJm2": round(float(max(0, 21 * np.sin((h - 6) / 12 * np.pi))), 1),
                "rainfallMm": round(rain, 2),
            })
    return out


OBSERVATIONS_7D = _observations()


def _satellite(days: int = 30, step: int = 5) -> list:
    out = []
    for d in range(days, 0, -step):
        t = NOW - timedelta(days=d)
        ndvi = 0.42 + 0.0035 * (30 - d) + _rng.normal(0, 0.012)
        ndwi = -0.08 + 0.002 * (30 - d) + _rng.normal(0, 0.01)
        out.append({
            "time": iso(t),
            "ndvi": round(float(min(max(ndvi, 0.1), 0.85)), 3),
            "ndwi": round(float(min(max(ndwi, -0.3), 0.2)), 3),
            "source": "Satellite-derived demo layer",
        })
    return out


SATELLITE_SERIES = _satellite()

# ---------------------------------------------------------------- irrigation history


def _history() -> list:
    rows = []
    decisions = [
        ("Irrigated", "High stress risk"), ("Waited", "Rain probability above threshold"),
        ("Irrigated", "Root-zone below refill point"), ("Partial", "Pre-rain deficit irrigation"),
        ("Irrigated", "Forecast dry window 48h"), ("Waited", "Moisture above MAD threshold"),
        ("Irrigated", "Flowering stage demand peak"), ("Waited", "Effective rainfall received"),
    ]
    for i in range(28):
        t = NOW - timedelta(days=(i // 2) + 1, hours=(i % 2) * 7)
        dec, reason = decisions[i % len(decisions)]
        zone = ["Zone A", "Zone B", "Zone C", "Zone D"][i % 4]
        pred = float([420, 720, 560, 640][i % 4] + _rng.integers(-40, 40))
        if dec == "Waited":
            applied = 0.0
            resp = round(float(_rng.normal(1.5, 1.0)), 1)
        elif dec == "Partial":
            applied = round(pred * 0.6, 0)
            resp = round(float(_rng.normal(8, 2)), 1)
        else:
            applied = round(pred * float(_rng.uniform(0.9, 1.1)), 0)
            resp = round(float(_rng.normal(13, 2.5)), 1)
        rows.append({
            "date": iso(t), "zone": zone,
            "appliedWaterL": applied,
            "predictedRequirementL": round(pred, 0),
            "moistureResponsePct": resp,
            "decision": dec, "reason": reason,
        })
    return rows


IRRIGATION_HISTORY = _history()

# ---------------------------------------------------------------- twin state

FIELD_STATE = {
    "fieldId": "field-a",
    "rootZoneMoisturePct": 24.6,
    "fieldCapacityPct": 34.0,
    "wiltingPointPct": 14.0,
    "evapotranspirationMmDay": 4.8,
    "effectiveRainfallMm48h": 11.2,
    "cropCoefficient": 1.12,
    "soilWaterHoldingMm": 68.0,
    "availableWaterMm": 19.4,
    "moisture6hDeltaPct": -2.4,
    "updatedAt": now_iso(),
}
