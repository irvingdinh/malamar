/**
 * Agents Module - Routes
 *
 * HTTP endpoints for agent operations.
 * Note: These routes are mounted under /api/workspaces/:id/agents
 */

import { Hono } from 'hono'
import { agentService } from './service'

const agents = new Hono<{ Variables: { workspaceId: string } }>()

// Extract workspace ID from path - it's guaranteed to exist when routes are mounted
agents.use('*', async (c, next) => {
  const workspaceId = c.req.param('id')
  if (!workspaceId) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Workspace ID is required' } },
      400
    )
  }
  c.set('workspaceId', workspaceId)
  return next()
})

/**
 * GET /api/workspaces/:id/agents - List all agents for a workspace
 */
agents.get('/', (c) => {
  const workspaceId = c.get('workspaceId')
  const list = agentService.listByWorkspace(workspaceId)
  return c.json(list)
})

/**
 * POST /api/workspaces/:id/agents - Create a new agent
 */
agents.post('/', async (c) => {
  const workspaceId = c.get('workspaceId')
  const body = await c.req.json<{
    name?: string
    roleInstruction?: string
    workingInstruction?: string
    timeoutMinutes?: number
  }>()

  const agent = agentService.create(workspaceId, {
    name: body.name ?? '',
    roleInstruction: body.roleInstruction,
    workingInstruction: body.workingInstruction,
    timeoutMinutes: body.timeoutMinutes,
  })

  return c.json(agent, 201)
})

/**
 * PUT /api/workspaces/:id/agents/reorder - Reorder agents
 * Note: This must come before :agentId route to avoid conflict
 */
agents.put('/reorder', async (c) => {
  const workspaceId = c.get('workspaceId')
  const body = await c.req.json<{ orderedIds?: string[] }>()

  if (!body.orderedIds || !Array.isArray(body.orderedIds)) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'orderedIds array is required',
        },
      },
      400
    )
  }

  const reorderedAgents = agentService.reorder(workspaceId, body.orderedIds)
  return c.json(reorderedAgents)
})

/**
 * PUT /api/workspaces/:id/agents/:agentId - Update an agent
 */
agents.put('/:agentId', async (c) => {
  const workspaceId = c.get('workspaceId')
  const agentId = c.req.param('agentId')!
  const body = await c.req.json<{
    name?: string
    roleInstruction?: string | null
    workingInstruction?: string | null
    timeoutMinutes?: number | null
  }>()

  const agent = agentService.update(workspaceId, agentId, {
    name: body.name,
    roleInstruction: body.roleInstruction,
    workingInstruction: body.workingInstruction,
    timeoutMinutes: body.timeoutMinutes,
  })

  return c.json(agent)
})

/**
 * DELETE /api/workspaces/:id/agents/:agentId - Delete an agent
 */
agents.delete('/:agentId', (c) => {
  const workspaceId = c.get('workspaceId')
  const agentId = c.req.param('agentId')!
  agentService.delete(workspaceId, agentId)
  return c.body(null, 204)
})

export { agents }
