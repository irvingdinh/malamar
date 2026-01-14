/**
 * Agents Module - Types
 */

export interface Agent {
  id: string
  workspaceId: string
  name: string
  roleInstruction: string | null
  workingInstruction: string | null
  order: number
  timeoutMinutes: number | null
  createdAt: number
  updatedAt: number
}

export interface CreateAgentInput {
  name: string
  roleInstruction?: string | null
  workingInstruction?: string | null
  timeoutMinutes?: number | null
}

export interface UpdateAgentInput {
  name?: string
  roleInstruction?: string | null
  workingInstruction?: string | null
  timeoutMinutes?: number | null
}

// Database row type (snake_case)
export interface AgentRow {
  id: string
  workspace_id: string
  name: string
  role_instruction: string | null
  working_instruction: string | null
  order: number
  timeout_minutes: number | null
  created_at: number
  updated_at: number
}
