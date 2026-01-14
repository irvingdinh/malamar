/**
 * Settings Module Tests
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { setupTestEnvironment, teardownTestEnvironment, get, put, json } from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Settings Module', () => {
  test('GET /api/settings - returns settings', async () => {
    const res = await get('/api/settings')
    expect(res.status).toBe(200)

    const data = await json<{
      clis: unknown[]
      server: unknown
      runtimePort: number
    }>(res)

    expect(data.clis).toBeDefined()
    expect(Array.isArray(data.clis)).toBe(true)
    expect(data.server).toBeDefined()
    expect(typeof data.runtimePort).toBe('number')
  })

  test('PUT /api/settings - updates settings', async () => {
    const res = await put('/api/settings', {
      server: { port: 4000 },
    })
    expect(res.status).toBe(200)

    const data = await json<{ server: { port: number } }>(res)
    expect(data.server.port).toBe(4000)
  })

  test('GET /api/settings/cli/health - returns CLI health', async () => {
    const res = await get('/api/settings/cli/health')
    expect(res.status).toBe(200)

    const data = await json<{
      installed: boolean
      version: string | null
      path: string | null
      checkedAt: number
    }>(res)

    expect(typeof data.installed).toBe('boolean')
    expect(typeof data.checkedAt).toBe('number')
  })

  test('GET /api/settings - returns runtime status fields', async () => {
    const res = await get('/api/settings')
    expect(res.status).toBe(200)

    const data = await json<{
      runtimePort: number
      runtimeClaudePath: string | null
      runtimeMaxConcurrent: number | null
    }>(res)

    expect(typeof data.runtimePort).toBe('number')
    // These can be null
    expect(data.runtimeClaudePath === null || typeof data.runtimeClaudePath === 'string').toBe(true)
  })
})
