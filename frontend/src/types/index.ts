export type LayerKind = "moisture" | "stress" | "ndvi" | "priority";

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lon, lat]
}

export interface GeoPolygon {
  type: "Polygon";
  coordinates: [number, number][][]; // rings of [lon, lat]
}

export interface Crop {
  name: string;
  variety: string;
  growthStage: string;
  daysAfterSowing: number;
  cropCoefficient: number;
}

export interface Sensor {
  id: string;
  zoneId: string;
  kind: "soil_moisture" | "temperature" | "rain_gauge";
  position: GeoPoint;
  depthCm?: number | null;
  lastValue: number;
  lastReadingAt: string;
  status: "live" | "demo" | "offline";
}

export interface Zone {
  id: string;
  name: string;
  areaHa: number;
  soilType: string;
  geometry: GeoPolygon;
  moisturePct: number;
  stressRiskPct: number;
  waterRequirementL: number;
  rainExposure: "Low" | "Medium" | "High";
  lastIrrigatedHoursAgo: number;
  ndvi: number;
  priority: number;
}

export interface ZoneState {
  zoneId: string;
  moisturePct: number;
  stressRiskPct: number;
  waterRequirementL: number;
  confidencePct: number;
}

export interface Field {
  id: string;
  name: string;
  areaHa: number;
  crop: Crop;
  geometry: GeoPolygon;
  sowingDate: string;
  soilTexture: string;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  fields: Field[];
}

export interface WeatherForecastRow {
  time: string;
  temperatureC: number;
  humidityPct: number;
  windKph: number;
  solarRadMJm2: number;
  rainfallMm: number;
  rainProbabilityPct: number;
}

export interface WeatherObservationRow {
  time: string;
  temperatureC: number;
  humidityPct: number;
  windKph: number;
  solarRadMJm2: number;
  rainfallMm: number;
}

export interface SatelliteObservation {
  time: string;
  ndvi: number;
  ndwi: number;
  source: string;
}

export interface IrrigationEvent {
  date: string;
  zone: string;
  appliedWaterL: number;
  predictedRequirementL: number;
  moistureResponsePct: number;
  decision: "Irrigated" | "Waited" | "Partial";
  reason: string;
}

export interface FieldTwinState {
  fieldId: string;
  rootZoneMoisturePct: number;
  fieldCapacityPct: number;
  wiltingPointPct: number;
  evapotranspirationMmDay: number;
  effectiveRainfallMm48h: number;
  cropCoefficient: number;
  soilWaterHoldingMm: number;
  availableWaterMm: number;
  moisture6hDeltaPct: number;
  updatedAt: string;
}

export interface TimelinePoint {
  hour: number;
  time: string;
  moisturePct: number;
}

export interface ScenarioFactor {
  label: string;
  value: string;
  weight: number;
}

export interface Scenario {
  key: string;
  label: string;
  description: string;
  waterUsedL: number;
  predictedMoisturePct: number;
  minMoisturePct: number;
  stressRiskPct: number;
  wasteRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  timeline: TimelinePoint[];
  factors: ScenarioFactor[];
  recommended: boolean;
}

export interface SimulationResult {
  generatedAt: string;
  baseline: { moisturePct: number; fieldCapacityPct: number; wiltingPointPct: number; availableWaterL: number };
  scenarios: Scenario[];
  recommendedKey: string;
}

export interface RainUncertaintyScenario {
  key: string;
  label: string;
  rainFraction: number;
  endMoisturePct: number;
  minMoisturePct: number;
  stressRiskPct: number;
  timeline: TimelinePoint[];
  verdict: string;
}

export interface ZoneAllocation {
  zoneId: string;
  zoneName: string;
  needL: number;
  allocatedL: number;
  priority: number;
  stressBeforePct: number;
  stressAfterPct: number;
  moistureAfterPct: number;
}

export interface OptimizationResult {
  availableWaterL: number;
  totalNeedL: number;
  totalAllocatedL: number;
  allocations: ZoneAllocation[];
  constraintStatus: string;
  waterSavedL: number;
  explanation: string;
  solver: string;
}

export interface RecommendationFactor {
  label: string;
  value: string;
  weight: number;
}

export interface Recommendation {
  action: string;
  headline: string;
  reason: string;
  waterSavedL: number;
  stressRiskPct: number;
  confidencePct: number;
  nextEvaluationAt: string;
  factors: RecommendationFactor[];
  recommendedKey: string;
}

export interface WaterFingerprint {
  moistureRetention: number;
  dryingRatePctPerDay: number;
  irrigationResponsePct: number;
  rainResponsePct: number;
  recoveryHours: number;
  notes: string[];
}

export interface SystemStatus {
  sensorStream: "LIVE" | "DEMO";
  weather: "UPDATED";
  satelliteLastSync: string;
  digitalTwin: "ACTIVE";
  demoMode: boolean;
}

export interface SensorFrame {
  type: string;
  step: number;
  timestamp: string;
  source: string;
  sensors: Sensor[];
}
