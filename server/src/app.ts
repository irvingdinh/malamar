/**
 * Malamar Server - Hono Application
 *
 * Main application setup with route composition and middleware.
 */

import { Hono } from "hono";
import { isAppError, log } from "./modules/core";
import { workspaces } from "./modules/workspaces";
import { agents } from "./modules/agents";
import { workspaceTasks, tasks, attachments } from "./modules/tasks";
import { templates } from "./modules/templates";
import { executions } from "./modules/executions";
import { events } from "./modules/events";
import { routing } from "./modules/routing";
import { settings } from "./modules/settings";
import { recovery } from "./modules/recovery";
import { health } from "./modules/health";
import { ui } from "./modules/ui";

const app = new Hono();

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  log.debug(`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`);
});

// Mount API routes
app.route("/api/health", health);
app.route("/api/workspaces", workspaces);
app.route("/api/workspaces/:id/agents", agents);
app.route("/api/workspaces/:id/tasks", workspaceTasks);
app.route("/api/workspaces/:id/templates", templates);
app.route("/api/tasks", tasks);
app.route("/api/attachments", attachments);
app.route("/api/executions", executions);
app.route("/api/events", events);
app.route("/api/routing", routing);
app.route("/api/settings", settings);
app.route("/api/recovery", recovery);

// UI static file serving (embedded in binary or from filesystem)
app.route("/", ui);

// 404 handler for API routes
app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Endpoint not found" } },
      404,
    );
  }
  // For non-API routes, return the placeholder for SPA
  return c.text("Malamar Server - Build UI first to see the dashboard");
});

// Global error handler
app.onError((err, c) => {
  if (isAppError(err)) {
    const status = err.statusCode as 400 | 404 | 409 | 500;
    return c.json(err.toResponse(), status);
  }

  log.error("Unhandled error", { error: String(err) });
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500,
  );
});

export { app };
