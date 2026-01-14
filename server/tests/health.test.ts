/**
 * Health Endpoint Tests
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { setupTestEnvironment, teardownTestEnvironment, get, json } from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Health Endpoint', () => {
  test('GET /api/health - returns health status', async () => {
    const res = await get('/api/health')
    expect(res.status).toBe(200)

    const data = await json<{
      version: string
      uptime: number
      status: string
      cli: { status: string; path: string | null }
    }>(res)

    expect(data.version).toBeDefined()
    expect(typeof data.uptime).toBe('number')
    expect(data.status).toBe('healthy')
    expect(data.cli).toBeDefined()
    expect(data.cli.status).toBeDefined()
  })

  test('GET /api/health - version is a valid semver', async () => {
    const res = await get('/api/health')
    const data = await json<{ version: string }>(res)

    // Should match semver pattern (e.g., 0.0.1)
    expect(data.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  test('GET /api/health - uptime increases over time', async () => {
    const res1 = await get('/api/health')
    const data1 = await json<{ uptime: number }>(res1)

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100))

    const res2 = await get('/api/health')
    const data2 = await json<{ uptime: number }>(res2)

    expect(data2.uptime).toBeGreaterThanOrEqual(data1.uptime)
  })
})
