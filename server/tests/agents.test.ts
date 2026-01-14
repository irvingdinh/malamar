/**
 * Agents Module Tests
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

describe('Agents Module', () => {
  let workspaceId: string
  let agentId: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Agents Test Workspace')
    workspaceId = ws.id
  })

  test('POST /api/workspaces/:id/agents - creates agent', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/agents`, {
      name: 'Test Agent',
      roleInstruction: 'You are a helpful agent',
      workingInstruction: 'Follow instructions carefully',
      timeoutMinutes: 30,
    })
    expect(res.status).toBe(201)

    const data = await json<{
      id: string
      workspaceId: string
      name: string
      roleInstruction: string | null
      workingInstruction: string | null
      order: number
      timeoutMinutes: number | null
    }>(res)

    expect(data.id).toBeDefined()
    expect(data.workspaceId).toBe(workspaceId)
    expect(data.name).toBe('Test Agent')
    expect(data.roleInstruction).toBe('You are a helpful agent')
    expect(data.workingInstruction).toBe('Follow instructions carefully')
    expect(data.order).toBe(0)
    expect(data.timeoutMinutes).toBe(30)

    agentId = data.id
  })

  test('POST /api/workspaces/:id/agents - creates agent with minimal data', async () => {
    const res = await post(`/api/workspaces/${workspaceId}/agents`, {
      name: 'Minimal Agent',
    })
    expect(res.status).toBe(201)

    const data = await json<{
      name: string
      roleInstruction: null
      workingInstruction: null
      timeoutMinutes: null
    }>(res)

    expect(data.name).toBe('Minimal Agent')
    expect(data.roleInstruction).toBeNull()
    expect(data.workingInstruction).toBeNull()
    expect(data.timeoutMinutes).toBeNull()
  })

  test('GET /api/workspaces/:id/agents - lists agents', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/agents`)
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; name: string; order: number }>>(res)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
  })

  test('GET /api/workspaces/:id/agents - agents are ordered', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/agents`)
    const data = await json<Array<{ order: number }>>(res)

    // Verify agents are in order
    for (let i = 1; i < data.length; i++) {
      expect(data[i].order).toBeGreaterThanOrEqual(data[i - 1].order)
    }
  })

  test('PUT /api/workspaces/:id/agents/:agentId - updates agent', async () => {
    const res = await put(`/api/workspaces/${workspaceId}/agents/${agentId}`, {
      name: 'Updated Agent Name',
      roleInstruction: 'Updated role',
    })
    expect(res.status).toBe(200)

    const data = await json<{ name: string; roleInstruction: string }>(res)
    expect(data.name).toBe('Updated Agent Name')
    expect(data.roleInstruction).toBe('Updated role')
  })

  test('PUT /api/workspaces/:id/agents/:agentId - clears optional fields with null', async () => {
    const res = await put(`/api/workspaces/${workspaceId}/agents/${agentId}`, {
      roleInstruction: null,
      workingInstruction: null,
      timeoutMinutes: null,
    })
    expect(res.status).toBe(200)

    const data = await json<{
      roleInstruction: null
      workingInstruction: null
      timeoutMinutes: null
    }>(res)

    expect(data.roleInstruction).toBeNull()
    expect(data.workingInstruction).toBeNull()
    expect(data.timeoutMinutes).toBeNull()
  })

  test('DELETE /api/workspaces/:id/agents/:agentId - deletes agent', async () => {
    const agent = await factory.createAgent(workspaceId, { name: 'To Delete' })

    const res = await del(`/api/workspaces/${workspaceId}/agents/${agent.id}`)
    expect(res.status).toBe(204)
  })
})

describe('Agent Reordering', () => {
  let workspaceId: string
  let agent1Id: string
  let agent2Id: string
  let agent3Id: string

  beforeAll(async () => {
    const ws = await factory.createWorkspace('Reorder Test Workspace')
    workspaceId = ws.id

    const agent1 = await factory.createAgent(workspaceId, { name: 'Agent 1' })
    const agent2 = await factory.createAgent(workspaceId, { name: 'Agent 2' })
    const agent3 = await factory.createAgent(workspaceId, { name: 'Agent 3' })

    agent1Id = agent1.id
    agent2Id = agent2.id
    agent3Id = agent3.id
  })

  test('PUT /api/workspaces/:id/agents/reorder - reorders agents', async () => {
    // Reorder: agent3 first, then agent1, then agent2
    const res = await put(`/api/workspaces/${workspaceId}/agents/reorder`, {
      orderedIds: [agent3Id, agent1Id, agent2Id],
    })
    expect(res.status).toBe(200)

    const data = await json<Array<{ id: string; order: number }>>(res)
    expect(Array.isArray(data)).toBe(true)

    // Verify order
    const agent3 = data.find((a) => a.id === agent3Id)
    const agent1 = data.find((a) => a.id === agent1Id)
    const agent2 = data.find((a) => a.id === agent2Id)

    expect(agent3?.order).toBe(0)
    expect(agent1?.order).toBe(1)
    expect(agent2?.order).toBe(2)
  })

  test('GET /api/workspaces/:id/agents - returns agents in new order', async () => {
    const res = await get(`/api/workspaces/${workspaceId}/agents`)
    const data = await json<Array<{ id: string; order: number }>>(res)

    // First agent should be agent3 (order 0)
    expect(data[0].id).toBe(agent3Id)
  })
})
