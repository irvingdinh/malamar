/**
 * Health Endpoint Tests
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  get,
  json,
} from "./setup";
import type { HealthResponse } from "../src/modules/health";
import { healthService } from "../src/modules/health";

beforeAll(async () => {
  await setupTestEnvironment();
});

afterAll(async () => {
  await teardownTestEnvironment();
});

describe("Health Endpoint", () => {
  test("GET /api/health - returns health status", async () => {
    const res = await get("/api/health");
    expect(res.status).toBe(200);

    const data = await json<HealthResponse>(res);

    expect(data.version).toBeDefined();
    expect(typeof data.uptime).toBe("number");
    expect(data.status).toBe("healthy");
    expect(data.clis).toBeDefined();
    expect(Array.isArray(data.clis)).toBe(true);
  });

  test("GET /api/health - clis array contains CLI status", async () => {
    const res = await get("/api/health");
    const data = await json<HealthResponse>(res);

    // Should have at least the claude CLI configured
    expect(data.clis.length).toBeGreaterThanOrEqual(1);

    const claudeCli = data.clis.find((cli) => cli.type === "claude");
    expect(claudeCli).toBeDefined();
    expect(claudeCli?.name).toBe("Claude Code");
    expect(typeof claudeCli?.installed).toBe("boolean");
  });

  test("GET /api/health - version is a valid semver", async () => {
    const res = await get("/api/health");
    const data = await json<HealthResponse>(res);

    // Should match semver pattern (e.g., 0.0.1)
    expect(data.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("GET /api/health - uptime increases over time", async () => {
    const res1 = await get("/api/health");
    const data1 = await json<HealthResponse>(res1);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    const res2 = await get("/api/health");
    const data2 = await json<HealthResponse>(res2);

    expect(data2.uptime).toBeGreaterThanOrEqual(data1.uptime);
  });

  test("healthService.clearCache - clears the CLI health cache", async () => {
    // First call to populate cache
    const res1 = await get("/api/health");
    const data1 = await json<HealthResponse>(res1);

    // Clear the cache
    healthService.clearCache();

    // Second call should still work (cache is rebuilt)
    const res2 = await get("/api/health");
    const data2 = await json<HealthResponse>(res2);

    // Both responses should be valid
    expect(data1.status).toBe("healthy");
    expect(data2.status).toBe("healthy");
  });
});
