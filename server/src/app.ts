/**
 * Malamar Server - Hono Application
 *
 * Main application setup with route composition and middleware.
 */

import { Hono } from 'hono'
import { isAppError, log } from './modules/core'

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
app.get('/api/health', (c) => {
  return c.json({
    version: VERSION,
    uptime: Math.floor(process.uptime()),
    status: 'healthy',
  })
})

// Root endpoint
app.get('/', (c) => {
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
