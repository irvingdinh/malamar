/**
 * Embedded Assets Module
 *
 * Provides runtime access to UI assets embedded in compiled Bun binaries.
 *
 * Strategy:
 * - Production: Assets are embedded via `import '...' with { type: 'file' }`
 *   and accessible through Bun.embeddedFiles at runtime
 * - Development: embeddedFiles are empty, server falls back to filesystem
 *
 * File Matching:
 * Bun transforms filenames when embedding (adds hash suffix), so we match
 * by stem + extension rather than exact name:
 *   Request: /assets/index-C60Fuvxw.css
 *   Embedded: index-C60Fuvxw-bunhash.css
 *   Match: startsWith("index-C60Fuvxw") && endsWith(".css")
 *
 * @see imports.ts - Import statements that trigger embedding
 * @see routes.ts - HTTP handlers that serve these assets
 */

import { embeddedFiles } from "bun";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

/** Returns MIME type for a file path based on extension */
export function getMimeType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/** Finds an embedded asset by web path using stem+extension matching */
export function findEmbeddedAsset(webPath: string): Blob | null {
  const filename = webPath.split("/").pop()!;
  const dotIndex = filename.lastIndexOf(".");
  const stem = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  const ext = dotIndex > 0 ? filename.substring(dotIndex) : "";

  const blob = [...embeddedFiles].find(
    // @ts-expect-error Blob.name exists on Bun embedded files
    (b) => b.name.startsWith(stem) && b.name.endsWith(ext),
  );

  return blob || null;
}

/** Returns true if running as compiled binary with embedded UI */
export function hasEmbeddedUI(): boolean {
  // @ts-expect-error Blob.name exists on Bun embedded files
  return embeddedFiles.some((f) => f.name.endsWith(".html"));
}
