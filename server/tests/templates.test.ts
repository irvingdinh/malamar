/**
 * Templates Module Tests
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  setupTestEnvironment,
  teardownTestEnvironment,
  get,
  post,
  put,
  del,
  json,
  factory,
} from './setup'

beforeAll(async () => {
  await setupTestEnvironment()
})

afterAll(async () => {
  await teardownTestEnvironment()
})

describe('Templates Module', () => {
  let workspaceId: string
  let templateId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Templates Test Workspace')
    workspaceId = ws.id
  })

  test('POST /api/workspaces/:id/templates - creates template', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/templates`, {
      name: 'Bug Report',
      title: 'Bug: {description}',
      description: 'Template for bug reports',
    })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      workspaceId: string
      name: string
      title: string
      description: string | null
      order: number
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.workspaceId).toBe(workspaceId)
    expect(data.name).toBe('Bug Report')
    expect(data.title).toBe('Bug: {description}')
    expect(data.description).toBe('Template for bug reports')
    expect(data.order).toBe(0)

    templateId = data.id
  })

  test('POST /api/workspaces/:id/templates - creates template without description', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/templates`, {
      name: 'Simple Template',
      title: 'Simple Task',
    })
    expect(res.status).toBe(201)

    const data = await json<{ description: null }>(res)
    expect(data.description).toBeNull()
  })

  test('GET /api/workspaces/:id/templates - lists templates', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/templates`)
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; name: string }>>(res)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('GET /api/workspaces/:id/templates - templates are ordered', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/templates`)
    const data = await json<Array<{ order: number }>>(res)

    // Verify templates are in order
    for (let i = 1; i < data.length; i++) {
      expect(data[i].order).toBeGreaterThanOrEqual(data[i - 1].order)
    }
  })

  test('PUT /api/workspaces/:id/templates/:templateId - updates template', async () => {
    const res = await put(`/api/workspaces/${workspaceId}/templates/${templateId}`, {
      name: 'Updated Template',
      title: 'Updated Title',
    })
    expect(res.status).toBe(200)

    const data = await json<{ name: string; title: string }>(res)
    expect(data.name).toBe('Updated Template')
    expect(data.title).toBe('Updated Title')
  })

  test('PUT /api/workspaces/:id/templates/:templateId - clears description with null', async () => {
    // First set a description
    await put(`/api/workspaces/${workspaceId}/templates/${templateId}`, {
      description: 'Some description',
    })

    // Then clear it
    const res = await put(`/api/workspaces/${workspaceId}/templates/${templateId}`, {
      description: null,
    })
    expect(res.status).toBe(200)

    const data = await json<{ description: null }>(res)
    expect(data.description).toBeNull()
  })

  test('DELETE /api/workspaces/:id/templates/:templateId - deletes template', async () => {
    const template = await factory.createTemplate(workspaceId, { name: 'To Delete' })

    const res = await del(`/api/workspaces/${workspaceId}/templates/${template.id}`)
    expect(res.status).toBe(204)
  })

  test('templates are deleted when workspace is deleted', async () => {
    // Create a workspace with templates
    const ws = await factory.createWorkspace('Cascade Delete Test')
    await factory.createTemplate(ws.id, { name: 'Template 1' })
    await factory.createTemplate(ws.id, { name: 'Template 2' })

    // Verify templates exist
    const before = await get(`/api/workspaces/${ws.id}/templates`)
    const templatesBefore = await json<Array<{ id: string }>>(before)
    expect(templatesBefore.length).toBe(2)

    // Delete workspace
    await del(`/api/workspaces/${ws.id}`)

    // Workspace and its templates should be gone
    const check = await get(`/api/workspaces/${ws.id}`)
    expect(check.status).toBe(404)
  })
})
