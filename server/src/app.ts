/**
 * Malamar Server - Hono Application
 *
 * Main application setup with route composition and middleware.
 */

import { Hono } from 'hono'

const app = new Hono()

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start
  console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`)
})

// Health endpoint
app.get('/api/health', (c) => {
  return c.json({
    version: '0.0.1',
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
    return c.json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404)
  }
  // For non-API routes, return placeholder for SPA
  return c.text('Malamar Server - Build UI first to see the dashboard')
})

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
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
