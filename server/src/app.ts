/**
 * Malamar Server - Hono Application
 *
 * Main application setup with route composition and middleware.
 */

import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { isAppError, log, getConfig } from './modules/core'
import { workspaces } from './modules/workspaces'
import { agents } from './modules/agents'
import { workspaceTasks, tasks, attachments } from './modules/tasks'
import { templates } from './modules/templates'
import { executions } from './modules/executions'
import { events } from './modules/events'
import { routing } from './modules/routing'

const VERSION = '0.0.1'

const app = new Hono()

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  log.debug(`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`)
})

// Health endpoint
app.get('/api/health', async (c) => {
  let cliStatus: { status: string; path: string | null } = {
    status: 'not_configured',
    path: null,
  }

  try {
    const config = getConfig()
    if (config.claudePath) {
      const exists = existsSync(config.claudePath)
      cliStatus = {
        status: exists ? 'configured' : 'not_found',
        path: config.claudePath,
      }
    } else {
      // Try to detect claude in PATH
      const proc = Bun.spawn(['which', 'claude'], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const output = await new Response(proc.stdout).text()
      const path = output.trim()
      if (path) {
        cliStatus = { status: 'detected', path }
      }
    }
  } catch {
    // Ignore errors during CLI detection
  }

  return c.json({
    version: VERSION,
    uptime: Math.floor(process.uptime()),
    status: 'healthy',
    cli: cliStatus,
  })
})

// Mount API routes
app.route('/api/workspaces', workspaces)
app.route('/api/workspaces/:id/agents', agents)
app.route('/api/workspaces/:id/tasks', workspaceTasks)
app.route('/api/workspaces/:id/templates', templates)
app.route('/api/tasks', tasks)
app.route('/api/attachments', attachments)
app.route('/api/executions', executions)
app.route('/api/events', events)
app.route('/api/routing', routing)

// Static file serving from public directory
const publicDir = join(import.meta.dir, '../public')

// Check if public directory exists and has index.html
function hasUI(): boolean {
  return existsSync(join(publicDir, 'index.html'))
}

// Serve static files if they exist
app.use('/*', async (c, next) => {
  const path = c.req.path

  // Skip API routes
  if (path.startsWith('/api/')) {
    return next()
  }

  // Check if this is a file request (has extension)
  const ext = extname(path)
  if (ext && hasUI()) {
    // Try to serve the static file
    const staticMiddleware = serveStatic({ root: publicDir })
    const response = await staticMiddleware(c, next)
    if (response) {
      return response
    }
  }

  return next()
})

// SPA fallback - serve index.html for non-API, non-file routes
app.get('*', async (c) => {
  const path = c.req.path

  // Skip API routes
  if (path.startsWith('/api/')) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Endpoint not found' } },
      404
    )
  }

  // Serve index.html if UI is built
  if (hasUI()) {
    const indexPath = join(publicDir, 'index.html')
    const file = Bun.file(indexPath)
    return new Response(file, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // UI not built - return placeholder message
  return c.text('Malamar Server - Build UI first to see the dashboard')
})

// 404 handler for API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json(
      { error: { code: 'NOT_FOUND', message: 'Endpoint not found' } },
      404
    )
  }
  // For non-API routes, return placeholder for SPA
  return c.text('Malamar Server - Build UI first to see the dashboard')
})

// Global error handler
app.onError((err, c) => {
  if (isAppError(err)) {
    const status = err.statusCode as 400 | 404 | 409 | 500
    return c.json(err.toResponse(), status)
  }

  log.error('Unhandled error', { error: String(err) })
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  )
})

export { app }
