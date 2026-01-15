/**
 * Health Module - Types
 *
 * Type definitions for the health endpoint.
 */

/**
 * Status of a single CLI
 */
export interface CliStatus {
  /** Display name for the CLI (e.g., "Claude Code") */
  name: string;
  /** CLI type identifier (e.g., "claude") */
  type: string;
  /** Whether the CLI is installed and accessible */
  installed: boolean;
  /** CLI version if available */
  version: string | null;
  /** Path to the CLI executable */
  path: string | null;
}

/**
 * Response from GET /api/health
 */
export interface HealthResponse {
  /** Server health status */
  status: "healthy";
  /** Server version from package.json */
  version: string;
  /** Server uptime in seconds */
  uptime: number;
  /** Array of CLI statuses */
  clis: CliStatus[];
}

/**
 * Map CLI type to display name
 */
export const CLI_DISPLAY_NAMES: Record<string, string> = {
  claude: "Claude Code",
  gemini: "Gemini CLI",
  codex: "OpenAI Codex",
  opencode: "OpenCode",
};
