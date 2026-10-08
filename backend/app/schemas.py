"""Pydantic domain schemas — mirrors frontend src/types/index.ts."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

LayerKind = Literal["moisture", "stress", "ndvi", "priority"]


# ---------- geo ----------

class GeoPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: List[float]  # [lon, lat]


class GeoPolygon(BaseModel):
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[List[float]]]


# ---------- entities ----------

class Crop(BaseModel):
    name: str
    variety: str
    growthStage: str
    daysAfterSowing: int
    cropCoefficient: float = Field(ge=0, le=2)


class Sensor(BaseModel):
    id: str
    zoneId: str
    kind: Literal["soil_moisture", "temperature", "rain_gauge"]
    position: GeoPoint
    depthCm: Optional[int] = None
    lastValue: float
    lastReadingAt: str
    status: Literal["live", "demo", "offline"] = "demo"


class Zone(BaseModel):
    id: str
    name: str
    areaHa: float
    soilType: str
    geometry: GeoPolygon
    moisturePct: float
    stressRiskPct: float
    waterRequirementL: float
    rainExposure: Literal["Low", "Medium", "High"]
    lastIrrigatedHoursAgo: float
    ndvi: float
    priority: int


class Field(BaseModel):
    id: str
    name: str
    areaHa: float
    crop: Crop
    geometry: GeoPolygon
    sowingDate: str
    soilTexture: str


class Farm(BaseModel):
    id: str
    name: str
    location: str
    fields: List[Field]


class WeatherObservation(BaseModel):
    time: str
    temperatureC: float
    humidityPct: float
    windKph: float
    solarRadMJm2: float
    rainfallMm: float


class WeatherForecast(BaseModel):
    time: str
    temperatureC: float
    humidityPct: float
    windKph: float
    solarRadMJm2: float
    rainfallMm: float
    rainProbabilityPct: float


class SatelliteObservation(BaseModel):
    time: str
    ndvi: float
    ndwi: float
    source: str = "Satellite-derived demo layer"


class IrrigationEvent(BaseModel):
    date: str
    zone: str
    appliedWaterL: float
    predictedRequirementL: float
    moistureResponsePct: float
    decision: Literal["Irrigated", "Waited", "Partial"]
    reason: str


class ZoneState(BaseModel):
    zoneId: str
    moisturePct: float
    stressRiskPct: float
    waterRequirementL: float
    confidencePct: float


# ---------- simulation ----------

class SimulationRequest(BaseModel):
    fieldId: str = "field-a"
    strategy: Literal["now", "wait3", "wait6", "wait12", "wait24", "partial"]
    horizonHours: int = 48


class ScenarioResult(BaseModel):
    key: str
    label: str
    description: str
    waterUsedL: float
    predictedMoisturePct: float
    minMoisturePct: float
    stressRiskPct: float
    wasteRisk: Literal["NONE", "LOW", "MEDIUM", "HIGH"]
    timeline: List[dict]
    factors: List[dict]
    recommended: bool = False


class SimulationResponse(BaseModel):
    generatedAt: str
    baseline: dict
    scenarios: List[ScenarioResult]
    recommendedKey: str


class RainUncertaintyResponse(BaseModel):
    scenarios: List[dict]


# ---------- optimization ----------

class OptimizationRequest(BaseModel):
    fieldId: str = "field-a"
    availableWaterL: float = 2000


class ZoneAllocation(BaseModel):
    zoneId: str
    zoneName: str
    needL: float
    allocatedL: float
    priority: int
    stressBeforePct: float
    stressAfterPct: float


class OptimizationResponse(BaseModel):
    availableWaterL: float
    totalNeedL: float
    totalAllocatedL: float
    allocations: List[ZoneAllocation]
    constraintStatus: Literal["Fully allocated", "Rationed", "Surplus"]
    waterSavedL: float
    explanation: str
    solver: str


# ---------- recommendation / analytics ----------

class RecommendationFactor(BaseModel):
    label: str
    value: str
    weight: float


class Recommendation(BaseModel):
    action: str
    headline: str
    reason: str
    waterSavedL: float
    stressRiskPct: float
    confidencePct: float
    nextEvaluationAt: str
    factors: List[RecommendationFactor]


class WaterFingerprint(BaseModel):
    moistureRetention: float
    dryingRatePctPerDay: float
    irrigationResponsePct: float
    rainResponsePct: float
    recoveryHours: float
    notes: List[str]


class SystemStatus(BaseModel):
    sensorStream: Literal["LIVE", "DEMO"]
    weather: Literal["UPDATED"]
    satelliteLastSync: str
    digitalTwin: Literal["ACTIVE"]
    demoMode: bool = True
