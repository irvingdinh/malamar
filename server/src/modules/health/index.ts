/**
 * Health Module
 *
 * Provides server health status including version and CLI availability.
 */

export { health } from "./routes";
export { healthService } from "./service";
export type { CliStatus, HealthResponse } from "./types";
