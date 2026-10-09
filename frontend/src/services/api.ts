/**
 * Production API Service facade — provides unified access to domain services.
 */

export * from "./api-client";
export * from "./dashboard.service";
export * from "./field-twin.service";
export * from "./simulation.service";
export * from "./irrigation.service";
export type { DataSource } from "@/hooks/useApiData";
