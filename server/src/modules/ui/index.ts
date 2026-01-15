/**
 * UI Module
 *
 * Serves the React web UI with support for both development and production:
 * - Development: Files served from filesystem (server/public/)
 * - Production: Files embedded in binary via Bun.embeddedFiles
 *
 * @see routes.ts - HTTP handlers
 * @see embedded-assets.ts - Asset lookup logic
 * @see imports.ts - Embedded file declarations (auto-generated)
 */

import "./imports";

export { ui } from "./routes";
export { findEmbeddedAsset, getMimeType, hasEmbeddedUI } from "./embedded-assets";
