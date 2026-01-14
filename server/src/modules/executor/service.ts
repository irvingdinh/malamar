/**
 * Executor Module - Service
 *
 * Main execution service for running agent tasks.
 * Handles workspace preparation, CLI spawning, and result processing.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ChildProcess } from 'node:child_process'
import { getConfig, log, now, safeJsonParse } from '../core'
import { executionService } from '../executions/service'
import { commentRepository } from '../tasks/comment-repository'
import {
  attachmentRepository,
  copyAttachmentFile,
} from '../tasks/attachment-repository'
import { workspaceRepository, settingsRepository } from '../workspaces/repository'
import { agentRepository } from '../agents/repository'
import { taskRepository } from '../tasks/repository'
import { emitExecutionLog, emitExecutionUpdated } from '../events/emitter'
import { getPool } from './pool'
import { spawnClaude, createTaskInputContent } from './adapters/claude'
import type { ExecutionContext, ProcessHandle, TaskOutput } from './types'
import type { Execution } from '../executions/types'
import type { Task } from '../tasks/types'
import type { Agent } from '../agents/types'
import type { Workspace } from '../workspaces/types'

// Map of running processes by execution ID
const runningProcesses = new Map<string, ProcessHandle>()

// Map of task ID to execution IDs (for canceling all executions for a task)
const taskExecutions = new Map<string, Set<string>>()

/**
 * Get the workspace directory for an execution
 */
function getExecutionWorkspacePath(executionId: string): string {
  const config = getConfig()
  return join(config.tmpDir, 'executions', executionId)
}

/**
 * Prepare the workspace directory for an execution
 */
function prepareWorkspace(
  executionId: string,
  task: Task,
  workspace: Workspace,
  workspaceInstruction: string | null,
  agent: Agent
): { workspacePath: string; inputPath: string } {
  const workspacePath = getExecutionWorkspacePath(executionId)

  // Clean up any existing workspace
  if (existsSync(workspacePath)) {
    rmSync(workspacePath, { recursive: true })
  }

  // Create the workspace directory
  mkdirSync(workspacePath, { recursive: true })

  // Get comments for the task
  const comments = commentRepository.findByTaskId(task.id)

  // Get and copy attachments
  const attachments = attachmentRepository.findByTaskId(task.id)
  const attachmentInfos: Array<{ filename: string; path: string }> = []

  for (const attachment of attachments) {
    const destPath = join(workspacePath, attachment.filename)
    try {
      copyAttachmentFile(attachment.storedName, workspacePath, attachment.filename)
      attachmentInfos.push({
        filename: attachment.filename,
        path: destPath,
      })
    } catch (error) {
      log.warn('Failed to copy attachment', {
        attachmentId: attachment.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Create task_input.json
  const inputContent = createTaskInputContent(
    {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
    },
    {
      id: workspace.id,
      name: workspace.name,
      instruction: workspaceInstruction,
    },
    {
      id: agent.id,
      name: agent.name,
      roleInstruction: agent.roleInstruction,
      workingInstruction: agent.workingInstruction,
    },
    comments.map((c) => ({
      author: c.author,
      authorType: c.authorType,
      content: c.content,
      createdAt: c.createdAt,
    })),
    attachmentInfos
  )

  const inputPath = join(workspacePath, 'task_input.json')
  writeFileSync(inputPath, inputContent, 'utf-8')

  log.debug('Prepared workspace', {
    executionId,
    workspacePath,
    inputPath,
    commentCount: comments.length,
    attachmentCount: attachmentInfos.length,
  })

  return { workspacePath, inputPath }
}

/**
 * Parse the task output file
 */
function readTaskOutput(workspacePath: string): TaskOutput | null {
  const outputPath = join(workspacePath, 'task_output.json')

  if (!existsSync(outputPath)) {
    log.debug('No task_output.json found', { outputPath })
    return null
  }

  try {
    const content = readFileSync(outputPath, 'utf-8')
    const parsed = safeJsonParse<TaskOutput>(content)

    if (!parsed) {
      log.warn('Failed to parse task_output.json', { outputPath })
      return null
    }

    // Validate result
    if (!['skip', 'comment', 'error'].includes(parsed.result)) {
      log.warn('Invalid result in task_output.json', { result: parsed.result })
      return null
    }

    return parsed
  } catch (error) {
    log.warn('Error reading task_output.json', {
      outputPath,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Clean up the workspace directory
 */
function cleanupWorkspace(executionId: string): void {
  const workspacePath = getExecutionWorkspacePath(executionId)

  if (existsSync(workspacePath)) {
    try {
      rmSync(workspacePath, { recursive: true })
      log.debug('Cleaned up workspace', { executionId, workspacePath })
    } catch (error) {
      log.warn('Failed to clean up workspace', {
        executionId,
        workspacePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

/**
 * Track a running process
 */
function trackProcess(
  executionId: string,
  taskId: string,
  process: ChildProcess,
  workspacePath: string
): ProcessHandle {
  const handle: ProcessHandle = {
    executionId,
    taskId,
    process: process as unknown as ProcessHandle['process'],
    workspacePath,
    startedAt: now(),
  }

  runningProcesses.set(executionId, handle)

  // Track by task ID as well
  if (!taskExecutions.has(taskId)) {
    taskExecutions.set(taskId, new Set())
  }
  taskExecutions.get(taskId)!.add(executionId)

  return handle
}

/**
 * Untrack a process
 */
function untrackProcess(executionId: string): void {
  const handle = runningProcesses.get(executionId)
  if (handle) {
    // Clear timeout if set
    if (handle.timeoutHandle) {
      clearTimeout(handle.timeoutHandle)
    }

    runningProcesses.delete(executionId)

    // Remove from task tracking
    const taskExecs = taskExecutions.get(handle.taskId)
    if (taskExecs) {
      taskExecs.delete(executionId)
      if (taskExecs.size === 0) {
        taskExecutions.delete(handle.taskId)
      }
    }
  }
}

/**
 * Kill a process by execution ID
 */
function killProcess(executionId: string): boolean {
  const handle = runningProcesses.get(executionId)
  if (!handle) {
    return false
  }

  try {
    // Try SIGTERM first, then SIGKILL
    if (handle.process.pid) {
      handle.process.kill('SIGTERM')

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (!handle.process.killed) {
          handle.process.kill('SIGKILL')
        }
      }, 5000)
    }

    return true
  } catch (error) {
    log.warn('Failed to kill process', {
      executionId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export const executorService = {
  /**
   * Execute a task with an agent
   */
  async execute(context: ExecutionContext): Promise<Execution> {
    const { execution, task, agent, workspace, workspaceInstruction } = context
    const pool = getPool()

    log.info('Starting execution', {
      executionId: execution.id,
      taskId: task.id,
      agentId: agent.id,
      agentName: agent.name,
    })

    // Acquire a slot from the concurrency pool
    const release = await pool.acquire()

    try {
      // Start the execution
      const startedExecution = executionService.start(execution.id)
      emitExecutionUpdated({
        id: startedExecution.id,
        taskId: startedExecution.taskId,
        status: startedExecution.status,
        result: startedExecution.result,
      })

      // Prepare the workspace
      const { workspacePath, inputPath } = prepareWorkspace(
        execution.id,
        task,
        workspace,
        workspaceInstruction,
        agent
      )

      // Spawn the CLI process
      const { process, promise } = spawnClaude({
        workspacePath,
        inputPath,
        onStdout: (data) => {
          log.debug('Claude stdout', { executionId: execution.id, data })
        },
        onStderr: (data) => {
          log.debug('Claude stderr', { executionId: execution.id, data })
        },
        onContent: (content) => {
          // Append to execution logs
          executionService.appendLog(execution.id, content)
          emitExecutionLog({
            executionId: execution.id,
            content,
            timestamp: now(),
          })
        },
      })

      // Track the process
      const handle = trackProcess(execution.id, task.id, process, workspacePath)

      // Set up timeout if configured
      if (agent.timeoutMinutes && agent.timeoutMinutes > 0) {
        const timeoutMs = agent.timeoutMinutes * 60 * 1000
        handle.timeoutHandle = setTimeout(() => {
          log.warn('Execution timed out', {
            executionId: execution.id,
            timeoutMinutes: agent.timeoutMinutes,
          })
          killProcess(execution.id)
        }, timeoutMs)
      }

      // Wait for the process to complete
      const exitResult = await promise

      // Untrack the process
      untrackProcess(execution.id)

      // Read the task output
      const taskOutput = readTaskOutput(workspacePath)

      // Clean up workspace
      cleanupWorkspace(execution.id)

      // Determine the result
      let finalExecution: Execution

      if (exitResult.killed) {
        // Process was killed (timeout or cancellation)
        finalExecution = executionService.fail(
          execution.id,
          'Execution was terminated (timeout or cancellation)'
        )
      } else if (exitResult.code !== 0) {
        // Non-zero exit code
        finalExecution = executionService.fail(
          execution.id,
          `CLI exited with code ${exitResult.code}`
        )
      } else if (!taskOutput) {
        // No output file - treat as skip
        finalExecution = executionService.complete(
          execution.id,
          'skip',
          'No task_output.json produced'
        )
      } else {
        // Process output
        finalExecution = executionService.complete(
          execution.id,
          taskOutput.result,
          taskOutput.content ?? null
        )
      }

      emitExecutionUpdated({
        id: finalExecution.id,
        taskId: finalExecution.taskId,
        status: finalExecution.status,
        result: finalExecution.result,
      })

      log.info('Execution completed', {
        executionId: execution.id,
        status: finalExecution.status,
        result: finalExecution.result,
      })

      return finalExecution
    } catch (error) {
      // Release the slot and clean up on error
      log.error('Execution failed with error', {
        executionId: execution.id,
        error: error instanceof Error ? error.message : String(error),
      })

      untrackProcess(execution.id)
      cleanupWorkspace(execution.id)

      const failedExecution = executionService.fail(
        execution.id,
        error instanceof Error ? error.message : String(error)
      )

      emitExecutionUpdated({
        id: failedExecution.id,
        taskId: failedExecution.taskId,
        status: failedExecution.status,
        result: failedExecution.result,
      })

      throw error
    } finally {
      release()
    }
  },

  /**
   * Cancel an execution
   */
  cancel(executionId: string): boolean {
    const handle = runningProcesses.get(executionId)
    if (!handle) {
      log.debug('No running process found for cancellation', { executionId })
      return false
    }

    log.info('Cancelling execution', { executionId })
    const killed = killProcess(executionId)

    if (killed) {
      untrackProcess(executionId)
      cleanupWorkspace(executionId)
    }

    return killed
  },

  /**
   * Cancel all executions for a task
   */
  cancelByTask(taskId: string): number {
    const execIds = taskExecutions.get(taskId)
    if (!execIds || execIds.size === 0) {
      return 0
    }

    log.info('Cancelling all executions for task', {
      taskId,
      count: execIds.size,
    })

    let cancelled = 0
    for (const executionId of execIds) {
      if (this.cancel(executionId)) {
        cancelled++
      }
    }

    return cancelled
  },

  /**
   * Get running process info
   */
  getRunningProcess(executionId: string): ProcessHandle | undefined {
    return runningProcesses.get(executionId)
  },

  /**
   * Get all running execution IDs
   */
  getRunningExecutions(): string[] {
    return Array.from(runningProcesses.keys())
  },

  /**
   * Get running executions for a task
   */
  getRunningExecutionsByTask(taskId: string): string[] {
    const execIds = taskExecutions.get(taskId)
    return execIds ? Array.from(execIds) : []
  },

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return getPool().getStats()
  },

  /**
   * Create execution context from IDs
   * Fetches all required entities and builds context
   */
  buildContext(
    execution: Execution,
    taskId: string,
    agentId: string
  ): ExecutionContext | null {
    const task = taskRepository.findById(taskId)
    if (!task) {
      log.warn('Task not found for execution context', { taskId })
      return null
    }

    const agent = agentRepository.findById(agentId)
    if (!agent) {
      log.warn('Agent not found for execution context', { agentId })
      return null
    }

    const workspace = workspaceRepository.findById(task.workspaceId)
    if (!workspace) {
      log.warn('Workspace not found for execution context', {
        workspaceId: task.workspaceId,
      })
      return null
    }

    const workspaceInstruction =
      (settingsRepository.get(workspace.id, 'instruction') as string) ?? null

    return {
      execution,
      task,
      agent,
      workspace,
      workspaceInstruction,
    }
  },
}
