"""Backend API Integration Tests for Production."""

import sys
import os
import unittest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db


class TestAquaTwinAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_health(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "aquatwin")

    def test_health_v1(self):
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")

    def test_list_farms(self):
        res = self.client.get("/api/farms")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("farms", data)
        self.assertIsInstance(data["farms"], list)

    def test_system_status(self):
        res = self.client.get("/api/system/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["demoMode"])
        self.assertIn(data["sensorStream"], ["LIVE", "OFFLINE"])

    def test_get_field_sensors(self):
        res = self.client.get("/api/fields/field-a/sensors")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("sensors", data)

    def test_get_field_satellite(self):
        res = self.client.get("/api/fields/field-a/satellite")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("series", data)

    def test_get_field_history(self):
        res = self.client.get("/api/fields/field-a/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("events", data)

    def test_get_field_weather(self):
        res = self.client.get("/api/fields/field-a/weather")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("forecast", data)
        self.assertIn("observations", data)

    def test_simulation_run(self):
        payload = {"startMoisturePct": 25.0, "horizonHours": 48, "availableWaterL": 2000}
        res = self.client.post("/api/simulation/run", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("scenarios", data)
        self.assertIn("recommendedKey", data)

    def test_simulation_rain_uncertainty(self):
        payload = {"strategy": "wait6", "startMoisturePct": 24.6}
        res = self.client.post("/api/simulation/rain-uncertainty", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("scenarios", data)

    def test_water_budget_optimize(self):
        # Explicit zones input
        zones = [
            {"id": "z1", "name": "Zone 1", "needL": 500, "priority": 1, "moisturePct": 22.0, "stressRiskPct": 15.0},
            {"id": "z2", "name": "Zone 2", "needL": 700, "priority": 2, "moisturePct": 24.0, "stressRiskPct": 10.0},
        ]
        payload = {"availableWaterL": 1000, "zones": zones}
        res = self.client.post("/api/water-budget/optimize", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("allocations", data)
        self.assertEqual(len(data["allocations"]), 2)

    def test_recommendation_honest_status(self):
        res = self.client.get("/api/recommendation?field_id=nonexistent")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("action", data)
        self.assertEqual(data["status"], "unavailable")

    def test_water_fingerprint(self):
        res = self.client.get("/api/analytics/water-fingerprint?field_id=nonexistent")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "unavailable")


if __name__ == "__main__":
    unittest.main()
