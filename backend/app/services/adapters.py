"""Adapters — DemoWeatherProvider / DemoSatelliteProvider / DemoSensorProvider.

Production implementations (OpenMeteo, Sentinel-2, IoT) implement the same
interface and plug in without touching route or service code.
"""

from __future__ import annotations

import random
from abc import ABC, abstractmethod

from app.services.demo_data import (
    FORECAST_48H,
    NOW,
    OBSERVATIONS_7D,
    SATELLITE_SERIES,
    SENSORS,
)

# ---------------------------------------------------------------- protocols


class WeatherProvider(ABC):
    name: str = "base"
    source_label: str = "Weather"

    @abstractmethod
    def get_forecast(self, hours: int = 48) -> list[dict]: ...

    @abstractmethod
    def get_observations(self, days: int = 7) -> list[dict]: ...


class SatelliteProvider(ABC):
    name: str = "base"
    source_label: str = "Satellite"

    @abstractmethod
    def get_series(self, days: int = 30) -> list[dict]: ...


class SensorProvider(ABC):
    name: str = "base"
    source_label: str = "Sensors"

    @abstractmethod
    def get_sensors(self) -> list[dict]: ...


# ---------------------------------------------------------------- demo providers


class DemoWeatherProvider(WeatherProvider):
    name = "demo"
    source_label = "Demo Data"

    def get_forecast(self, hours: int = 48) -> list[dict]:
        return FORECAST_48H[:hours]

    def get_observations(self, days: int = 7) -> list[dict]:
        return OBSERVATIONS_7D[-days * 5:]


class DemoSatelliteProvider(SatelliteProvider):
    name = "demo"
    source_label = "Satellite-derived demo layer"

    def get_series(self, days: int = 30) -> list[dict]:
        return SATELLITE_SERIES


class DemoSensorProvider(SensorProvider):
    """Simulated streaming sensor data — deterministic walk seeded per sensor."""

    name = "demo"
    source_label = "Simulated Sensor Stream"

    def get_sensors(self) -> list[dict]:
        return [dict(s) for s in SENSORS]

    def tick(self, step: int) -> list[dict]:
        """Produce the next stream frame; deterministic per step index."""
        out = []
        for s in SENSORS:
            v = s["lastValue"]
            if s["kind"] == "soil_moisture":
                v += random.Random((step, s["id"])).uniform(-0.15, 0.1)
                v = max(18.0, min(30.0, v))
            elif s["kind"] == "temperature":
                v += random.Random((step, s["id"])).uniform(-0.2, 0.2)
            out.append({**s, "lastValue": round(v, 2),
                        "lastReadingAt": NOW.isoformat().replace("+00:00", "Z")})
        return out


# later: OpenMeteoWeatherProvider, SentinelSatelliteProvider, IoTSensorProvider
