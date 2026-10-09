# AquaTwin API Contracts

This document outlines the API endpoints exposed by the AquaTwin FastAPI service (available at `/api` and `/api/v1`).

---

## 1. Health & System Status

### `GET /api/health`
Returns service status and active farm identification.
- **Response**:
```json
{
  "status": "ok",
  "service": "aquatwin",
  "farm": "Green Valley Research Farm"
}
```

### `GET /api/system/status`
Returns status for telemetry streams and digital twin computation.
- **Response**:
```json
{
  "sensorStream": "DEMO",
  "weather": "UPDATED",
  "satelliteLastSync": "2026-10-09T04:45:00.000Z",
  "digitalTwin": "ACTIVE",
  "demoMode": true
}
```

---

## 2. Farm & Field State

### `GET /api/farms`
Lists farms managed under the active tenant.
- **Response**: `{ "farms": [ Farm ] }`

### `GET /api/fields/{field_id}`
Returns field boundary geometry, active crop metadata, and sowing date.

### `GET /api/fields/{field_id}/state`
Returns the digital twin's current physical state.
- **Response**:
```json
{
  "fieldId": "field-a",
  "rootZoneMoisturePct": 24.6,
  "soilMoisture10cmPct": 26.1,
  "soilMoisture30cmPct": 23.8,
  "fieldCapacityPct": 34.0,
  "wiltingPointPct": 14.0,
  "stressRiskPct": 11.2,
  "updatedAt": "2026-10-09T04:45:00.000Z"
}
```

### `GET /api/fields/{field_id}/zones`
Returns zone boundaries and current individual zone health scores.

### `GET /api/fields/{field_id}/weather`
Returns 48-hour forecast and 7-day weather observations.

### `GET /api/fields/{field_id}/satellite`
Returns 30-day time-series NDVI and NDWI vegetation indexes.

### `GET /api/fields/{field_id}/sensors`
Returns current sensor telemetry points across zones.

### `GET /api/fields/{field_id}/history`
Returns past irrigation events, applied water quantities, and soil responses.

---

## 3. What-If Simulation

### `POST /api/simulation/run`
Runs a 48-hour moisture projection for multiple irrigation strategies.
- **Request Body**:
```json
{
  "startMoisturePct": 24.6,
  "horizonHours": 48,
  "availableWaterL": 2000
}
```
- **Response**:
```json
{
  "generatedAt": "2026-10-09T04:45:00.000Z",
  "baseline": { ... },
  "scenarios": [
    {
      "key": "wait6",
      "label": "Wait 6 Hours",
      "waterUsedL": 310,
      "predictedMoisturePct": 25.1,
      "minMoisturePct": 22.4,
      "stressRiskPct": 8.4,
      "wasteRisk": "LOW",
      "recommended": true,
      "timeline": [ ... ]
    }
  ],
  "recommendedKey": "wait6"
}
```

### `POST /api/simulation/rain-uncertainty`
Evaluates risk under 3 scenarios: rain occurs (100%), rain partially occurs (50%), and rain fails (0%).

---

## 4. Water Budget Optimization

### `POST /api/water-budget/optimize`
Performs constrained resource allocation across zones using priority-weighted mathematical optimization.
- **Request Body**:
```json
{
  "availableWaterL": 1500
}
```
- **Response**:
```json
{
  "availableWaterL": 1500,
  "totalNeedL": 2180,
  "totalAllocatedL": 1500,
  "allocations": [
    {
      "zoneId": "z1",
      "zoneName": "North Paddy (Zone 1)",
      "needL": 620,
      "allocatedL": 520,
      "priority": 1,
      "stressBeforePct": 18.2,
      "stressAfterPct": 7.4
    }
  ],
  "constraintStatus": "Rationed",
  "waterSavedL": 680,
  "solver": "OR-Tools CP-SAT"
}
```

---

## 5. WebSocket Telemetry

### `ws://localhost:8000/api/ws/field/{field_id}`
Broadcasts streaming sensor frames every 3 seconds for real-time map visualization.
