/**
 * Central API Service facade — provides unified access to domain services
 * while maintaining 100% backward compatibility for all existing imports.
 */

export * from "./api-client";
export * from "./dashboard.service";
export * from "./field-twin.service";
export * from "./simulation.service";
export * from "./irrigation.service";

// Re-export demo engine utilities used by components
export {
  getRecommendation,
  optimizeWater,
  rainUncertainty,
  runFullSimulation,
} from "@/lib/demo-engine";
