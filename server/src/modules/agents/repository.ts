/**
 * Agents Module - Repository
 *
 * Database operations for agents.
 */

import { getDb, generateId, now } from '../core'
import type {
  Agent,
  AgentRow,
  CreateAgentInput,
  UpdateAgentInput,
} from './types'

// Helper to convert database row to Agent
function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    roleInstruction: row.role_instruction,
    workingInstruction: row.working_instruction,
    order: row.order,
    timeoutMinutes: row.timeout_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const agentRepository = {
  /**
   * Find all agents for a workspace ordered by order asc
   */
  findByWorkspaceId(workspaceId: string): Agent[] {
    const db = getDb()
    const rows = db
      .query<AgentRow, [string]>(
        'SELECT * FROM agents WHERE workspace_id = ? ORDER BY "order" ASC'
      )
      .all(workspaceId)
    return rows.map(rowToAgent)
  },

  /**
   * Find an agent by ID
   */
  findById(id: string): Agent | null {
    const db = getDb()
    const row = db
      .query<AgentRow, [string]>('SELECT * FROM agents WHERE id = ?')
      .get(id)
    return row ? rowToAgent(row) : null
  },

  /**
   * Get the next order value for a workspace
   */
  getNextOrder(workspaceId: string): number {
    const db = getDb()
    const result = db
      .query<{ max_order: number | null }, [string]>(
        'SELECT MAX("order") as max_order FROM agents WHERE workspace_id = ?'
      )
      .get(workspaceId)
    return (result?.max_order ?? -1) + 1
  },

  /**
   * Create a new agent
   */
  create(workspaceId: string, data: CreateAgentInput): Agent {
    const db = getDb()
    const id = generateId()
    const timestamp = now()
    const order = this.getNextOrder(workspaceId)

    db.run(
      `INSERT INTO agents (id, workspace_id, name, role_instruction, working_instruction, "order", timeout_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        workspaceId,
        data.name,
        data.roleInstruction ?? null,
        data.workingInstruction ?? null,
        order,
        data.timeoutMinutes ?? null,
        timestamp,
        timestamp,
      ]
    )

    return {
      id,
      workspaceId,
      name: data.name,
      roleInstruction: data.roleInstruction ?? null,
      workingInstruction: data.workingInstruction ?? null,
      order,
      timeoutMinutes: data.timeoutMinutes ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },

  /**
   * Update an agent
   */
  update(id: string, data: UpdateAgentInput): Agent | null {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    const timestamp = now()
    const name = data.name ?? existing.name
    const roleInstruction =
      data.roleInstruction !== undefined
        ? data.roleInstruction
        : existing.roleInstruction
    const workingInstruction =
      data.workingInstruction !== undefined
        ? data.workingInstruction
        : existing.workingInstruction
    const timeoutMinutes =
      data.timeoutMinutes !== undefined
        ? data.timeoutMinutes
        : existing.timeoutMinutes

    db.run(
      `UPDATE agents SET name = ?, role_instruction = ?, working_instruction = ?, timeout_minutes = ?, updated_at = ? WHERE id = ?`,
      [name, roleInstruction, workingInstruction, timeoutMinutes, timestamp, id]
    )

    return {
      ...existing,
      name,
      roleInstruction,
      workingInstruction,
      timeoutMinutes,
      updatedAt: timestamp,
    }
  },

  /**
   * Delete an agent
   */
  delete(id: string): boolean {
    const db = getDb()
    const result = db.run('DELETE FROM agents WHERE id = ?', [id])
    return result.changes > 0
  },

  /**
   * Reorder agents for a workspace
   */
  reorder(workspaceId: string, orderedIds: string[]): void {
    const db = getDb()
    const timestamp = now()

    db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        const agentId = orderedIds[i]!
        db.run(
          `UPDATE agents SET "order" = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
          [i, timestamp, agentId, workspaceId]
        )
      }
    })()
  },

  /**
   * Recompute order values after deletion
   */
  recomputeOrder(workspaceId: string): void {
    const db = getDb()
    const agents = this.findByWorkspaceId(workspaceId)
    const timestamp = now()

    db.transaction(() => {
      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i]!
        if (agent.order !== i) {
          db.run(
            `UPDATE agents SET "order" = ?, updated_at = ? WHERE id = ?`,
            [i, timestamp, agent.id]
          )
        }
      }
    })()
  },
}
