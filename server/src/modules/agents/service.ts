/**
 * Agents Module - Service
 *
 * Business logic for agent operations.
 */

import { NotFoundError, ValidationError } from '../core'
import { workspaceRepository } from '../workspaces/repository'
import { agentRepository } from './repository'
import type { Agent, CreateAgentInput, UpdateAgentInput } from './types'

export const agentService = {
  /**
   * List all agents for a workspace
   */
  listByWorkspace(workspaceId: string): Agent[] {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    return agentRepository.findByWorkspaceId(workspaceId)
  },

  /**
   * Get an agent by ID
   */
  get(id: string): Agent {
    const agent = agentRepository.findById(id)
    if (!agent) {
      throw new NotFoundError(`Agent not found: ${id}`)
    }
    return agent
  },

  /**
   * Create a new agent
   */
  create(workspaceId: string, data: CreateAgentInput): Agent {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Agent name is required', {
        name: 'Name is required',
      })
    }

    return agentRepository.create(workspaceId, {
      name: data.name.trim(),
      roleInstruction: data.roleInstruction?.trim() || null,
      workingInstruction: data.workingInstruction?.trim() || null,
      timeoutMinutes: data.timeoutMinutes ?? null,
    })
  },

  /**
   * Update an agent
   */
  update(workspaceId: string, agentId: string, data: UpdateAgentInput): Agent {
    // Verify agent exists and belongs to workspace
    const agent = agentRepository.findById(agentId)
    if (!agent) {
      throw new NotFoundError(`Agent not found: ${agentId}`)
    }
    if (agent.workspaceId !== workspaceId) {
      throw new NotFoundError(`Agent not found in workspace: ${agentId}`)
    }

    // Validate name if provided
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError('Agent name cannot be empty', {
        name: 'Name cannot be empty',
      })
    }

    const updateData: UpdateAgentInput = {}
    if (data.name !== undefined) {
      updateData.name = data.name.trim()
    }
    if (data.roleInstruction !== undefined) {
      updateData.roleInstruction = data.roleInstruction?.trim() || null
    }
    if (data.workingInstruction !== undefined) {
      updateData.workingInstruction = data.workingInstruction?.trim() || null
    }
    if (data.timeoutMinutes !== undefined) {
      updateData.timeoutMinutes = data.timeoutMinutes
    }

    const updated = agentRepository.update(agentId, updateData)
    if (!updated) {
      throw new NotFoundError(`Agent not found: ${agentId}`)
    }

    return updated
  },

  /**
   * Delete an agent
   */
  delete(workspaceId: string, agentId: string): void {
    // Verify agent exists and belongs to workspace
    const agent = agentRepository.findById(agentId)
    if (!agent) {
      throw new NotFoundError(`Agent not found: ${agentId}`)
    }
    if (agent.workspaceId !== workspaceId) {
      throw new NotFoundError(`Agent not found in workspace: ${agentId}`)
    }

    agentRepository.delete(agentId)

    // Recompute order for remaining agents
    agentRepository.recomputeOrder(workspaceId)
  },

  /**
   * Reorder agents
   */
  reorder(workspaceId: string, orderedIds: string[]): Agent[] {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    // Verify all agents belong to the workspace
    const existingAgents = agentRepository.findByWorkspaceId(workspaceId)
    const existingIds = new Set(existingAgents.map((a) => a.id))

    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new ValidationError(`Agent not found in workspace: ${id}`, {
          orderedIds: `Invalid agent ID: ${id}`,
        })
      }
    }

    // Verify all agents are included
    if (orderedIds.length !== existingAgents.length) {
      throw new ValidationError(
        'All agents must be included in the reorder request',
        {
          orderedIds: `Expected ${existingAgents.length} agents, got ${orderedIds.length}`,
        }
      )
    }

    agentRepository.reorder(workspaceId, orderedIds)

    return agentRepository.findByWorkspaceId(workspaceId)
  },
}
