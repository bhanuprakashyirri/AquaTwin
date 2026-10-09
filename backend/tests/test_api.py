"""Backend API Integration Tests."""

import sys
import os
import unittest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app


class TestAquaTwinAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
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
        self.assertGreater(len(data["farms"]), 0)

    def test_get_field(self):
        res = self.client.get("/api/fields/field-a")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], "field-a")

    def test_get_field_state(self):
        res = self.client.get("/api/fields/field-a/state")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("rootZoneMoisturePct", data)
        self.assertIn("updatedAt", data)

    def test_get_field_zones(self):
        res = self.client.get("/api/fields/field-a/zones")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("zones", data)
        self.assertIn("zoneStates", data)

    def test_get_field_weather(self):
        res = self.client.get("/api/fields/field-a/weather")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("forecast", data)
        self.assertIn("observations", data)
        self.assertIn("summary", data)

    def test_get_field_satellite(self):
        res = self.client.get("/api/fields/field-a/satellite")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("series", data)

    def test_get_field_sensors(self):
        res = self.client.get("/api/fields/field-a/sensors")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("sensors", data)

    def test_get_field_history(self):
        res = self.client.get("/api/fields/field-a/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("events", data)

    def test_simulation_run(self):
        payload = {"startMoisturePct": 25.0, "horizonHours": 48, "availableWaterL": 2000}
        res = self.client.post("/api/simulation/run", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("scenarios", data)
        self.assertIn("recommendedKey", data)

    def test_water_budget_optimize(self):
        payload = {"availableWaterL": 1500}
        res = self.client.post("/api/water-budget/optimize", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("allocations", data)
        self.assertIn("constraintStatus", data)

    def test_recommendation(self):
        res = self.client.get("/api/recommendation")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("action", data)
        self.assertIn("confidencePct", data)

    def test_system_status(self):
        res = self.client.get("/api/system/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["digitalTwin"], "ACTIVE")

    def test_water_fingerprint(self):
        res = self.client.get("/api/analytics/water-fingerprint")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("dryingRatePctPerDay", data)


if __name__ == "__main__":
    unittest.main()
