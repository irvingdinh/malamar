/**
 * Health Module - Routes
 *
 * HTTP endpoint for health checks.
 */

import { Hono } from "hono";
import { healthService } from "./service";

const health = new Hono();

/**
 * GET /api/health
 *
 * Returns server health status including version, uptime, and CLI statuses.
 */
health.get("/", async (c) => {
  const result = await healthService.getHealth();
  return c.json(result);
});

export { health };
