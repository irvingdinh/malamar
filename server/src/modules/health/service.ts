/**
 * Health Module - Service
 *
 * Business logic for health checks with CLI status caching.
 */

import { existsSync } from "node:fs";
import { getConfig, log } from "../core";
import { getVersion } from "../../cli/commands/version";
import type { CliStatus, HealthResponse } from "./types";
import { CLI_DISPLAY_NAMES } from "./types";

// Cache for CLI health checks (5-second TTL per CLI)
interface CachedCliStatus {
  status: CliStatus;
  checkedAt: number;
}

const cliHealthCache = new Map<string, CachedCliStatus>();
const HEALTH_CACHE_TTL_MS = 5000;

/**
 * Check the health of a single CLI
 */
async function checkSingleCliHealth(
  type: string,
  configuredPath: string | null,
): Promise<CliStatus> {
  const now = Date.now();
  const cacheKey = `${type}:${configuredPath ?? "auto"}`;

  // Check cache first
  const cached = cliHealthCache.get(cacheKey);
  if (cached && now - cached.checkedAt < HEALTH_CACHE_TTL_MS) {
    return cached.status;
  }

  const displayName = CLI_DISPLAY_NAMES[type] ?? type;
  let resolvedPath = configuredPath;

  // Auto-detect path if not configured
  if (!resolvedPath) {
    try {
      const proc = Bun.spawn(["which", type], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      if (exitCode === 0 && output.trim()) {
        resolvedPath = output.trim();
      }
    } catch {
      // Ignore detection errors
    }
  }

  // No path found or file doesn't exist
  if (!resolvedPath || !existsSync(resolvedPath)) {
    const status: CliStatus = {
      name: displayName,
      type,
      installed: false,
      version: null,
      path: resolvedPath,
    };
    cliHealthCache.set(cacheKey, { status, checkedAt: now });
    return status;
  }

  // Execute --version to get version
  try {
    const proc = Bun.spawn([resolvedPath, "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      // Match version including pre-release tags (e.g., "1.2.3-beta.1")
      const versionMatch = output.trim().match(/[\d.]+(-[\w.]+)?/);
      const version = versionMatch ? versionMatch[0] : output.trim();
      const status: CliStatus = {
        name: displayName,
        type,
        installed: true,
        version,
        path: resolvedPath,
      };
      cliHealthCache.set(cacheKey, { status, checkedAt: now });
      return status;
    }
  } catch (error) {
    log.debug("CLI version check failed", { type, error: String(error) });
  }

  // CLI exists but version check failed
  const status: CliStatus = {
    name: displayName,
    type,
    installed: false,
    version: null,
    path: resolvedPath,
  };
  cliHealthCache.set(cacheKey, { status, checkedAt: now });
  return status;
}

export const healthService = {
  /**
   * Get complete health status including server info and all CLIs
   */
  async getHealth(): Promise<HealthResponse> {
    const config = getConfig();

    // Get CLI configurations
    // Currently only Claude, but structured for future CLIs
    const cliConfigs = [{ type: "claude", path: config.claudePath }];

    // Check all CLIs in parallel
    const cliStatuses = await Promise.all(
      cliConfigs.map((cli) => checkSingleCliHealth(cli.type, cli.path)),
    );

    return {
      status: "healthy",
      version: getVersion(),
      uptime: Math.floor(process.uptime()),
      clis: cliStatuses,
    };
  },

  /**
   * Clear the CLI health cache (useful for testing)
   */
  clearCache(): void {
    cliHealthCache.clear();
  },
};
