/**
 * UI Routes Module
 *
 * Serves the React UI with dual-mode support:
 * - Production (compiled binary): Serves from Bun.embeddedFiles
 * - Development (bun run dev): Serves from filesystem (server/public/)
 *
 * Features:
 * - Static file serving with proper MIME types
 * - SPA fallback (serves index.html for client-side routing)
 * - Graceful degradation when UI isn't built
 *
 * Request Flow:
 * 1. Middleware checks if a path has a file extension
 * 2. If yes, attempt to serve a static file (embedded or filesystem)
 * 3. If no file is found, fall through to SPA handler
 * 4. SPA handler serves index.html for all non-API routes
 *
 * @see embedded-assets.ts - Asset lookup logic
 * @see imports.ts - Embedded file declarations
 */

import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { Hono } from "hono";
import {
  findEmbeddedAsset,
  getMimeType,
  hasEmbeddedUI,
} from "./embedded-assets";

const ui = new Hono();

const isCompiled = hasEmbeddedUI();
const publicDir = join(import.meta.dir, "../../public");

/** Check if the UI is available (embedded or on filesystem) */
function hasUI(): boolean {
  if (isCompiled) return true;
  return existsSync(join(publicDir, "index.html"));
}

/** Serve a static file from embedded assets or filesystem */
function getFileResponse(path: string): Response | null {
  const mimeType = getMimeType(path);

  if (isCompiled) {
    const blob = findEmbeddedAsset(path);
    if (blob) {
      return new Response(blob, {
        headers: { "Content-Type": mimeType },
      });
    }
    return null;
  }

  const filePath = join(publicDir, path);
  if (existsSync(filePath)) {
    return new Response(Bun.file(filePath), {
      headers: { "Content-Type": mimeType },
    });
  }

  return null;
}

/** Serve index.html for SPA client-side routing */
function getIndexResponse(): Response | null {
  if (isCompiled) {
    const blob = findEmbeddedAsset("/index.html");
    if (blob) {
      return new Response(blob, {
        headers: { "Content-Type": "text/html" },
      });
    }
    return null;
  }

  const indexPath = join(publicDir, "index.html");
  if (existsSync(indexPath)) {
    return new Response(Bun.file(indexPath), {
      headers: { "Content-Type": "text/html" },
    });
  }

  return null;
}

/**
 * Static file middleware
 * Serves files with extensions (css, js, images, etc.)
 */
ui.use("/*", async (c, next) => {
  const path = c.req.path;

  if (path.startsWith("/api/")) return next();

  const ext = extname(path);
  if (ext && hasUI()) {
    const response = getFileResponse(path);
    if (response) return response;
  }

  return next();
});

/**
 * SPA fallback handler
 * Serves index.html for all non-API, non-file routes
 */
ui.get("*", async (c) => {
  const path = c.req.path;

  if (path.startsWith("/api/")) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Endpoint not found" } },
      404,
    );
  }

  if (hasUI()) {
    const response = getIndexResponse();
    if (response) return response;
  }

  return c.text("Malamar Server - Build UI first to see the dashboard");
});

export { ui };
