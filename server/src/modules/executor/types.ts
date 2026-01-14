/**
 * Executor Module - Types
 *
 * Type definitions for task execution management.
 */

import type { Execution } from '../executions/types'
import type { Task } from '../tasks/types'
import type { Agent } from '../agents/types'
import type { Workspace } from '../workspaces/types'

/**
 * Result from an agent execution
 */
export type AgentResult = 'skip' | 'comment' | 'error'

/**
 * Output parsed from task_output.json
 */
export interface TaskOutput {
  result: AgentResult
  content?: string
}

/**
 * Task input written to task_input.json
 */
export interface TaskInput {
  task: {
    id: string
    title: string
    description: string | null
    status: string
  }
  workspace: {
    id: string
    name: string
    instruction: string | null
  }
  agent: {
    id: string
    name: string
    roleInstruction: string | null
    workingInstruction: string | null
  }
  comments: Array<{
    author: string
    authorType: string
    content: string
    createdAt: number
  }>
  attachments: Array<{
    filename: string
    path: string
  }>
}

/**
 * Context passed to the executor for running a task
 */
export interface ExecutionContext {
  execution: Execution
  task: Task
  agent: Agent
  workspace: Workspace
  workspaceInstruction: string | null
}

/**
 * Handle for a running process
 */
export interface ProcessHandle {
  executionId: string
  taskId: string
  process: ChildProcessHandle
  workspacePath: string
  startedAt: number
  timeoutHandle?: ReturnType<typeof setTimeout>
}

/**
 * Minimal interface for process control
 */
export interface ChildProcessHandle {
  pid: number | undefined
  killed: boolean
  kill(signal?: NodeJS.Signals): boolean
  on(event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void): void
}

/**
 * Pool statistics
 */
export interface PoolStats {
  current: number
  max: number | null
  available: number | null
}
