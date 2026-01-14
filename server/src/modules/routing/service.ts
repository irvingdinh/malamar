/**
 * Routing Module - Service
 *
 * Business logic for task routing and sequential agent execution.
 *
 * The routing service manages the execution flow of agents for a task:
 * 1. Agents are executed sequentially in order (0 to N-1)
 * 2. Each agent can return: skip, comment, or error
 * 3. If any agent returns "comment", the anyAgentWorked flag is set
 * 4. After all agents complete an iteration:
 *    - If anyAgentWorked: reset to agent 0, increment iteration, continue
 *    - If not worked: complete routing, set task to in_review
 * 5. Timeout counts as "worked" (anyAgentWorked = true)
 * 6. CLI crash: retry up to 3 times, then continue to next agent
 */

import { NotFoundError, log } from '../core'
import { taskRepository } from '../tasks/repository'
import { agentRepository } from '../agents/repository'
import { commentRepository } from '../tasks/comment-repository'
import { executionService } from '../executions/service'
import { executorService } from '../executor/service'
import { emitRoutingUpdated, emitExecutionCreated, emitTaskUpdated } from '../events/emitter'
import { routingRepository } from './repository'
import type { TaskRouting, RoutingListFilters } from './types'
import type { Agent } from '../agents/types'

// Maximum number of retries for a single agent
const MAX_RETRIES = 3

export const routingService = {
  /**
   * List all routings with optional filters
   */
  list(filters?: RoutingListFilters): TaskRouting[] {
    return routingRepository.findAll(filters)
  },

  /**
   * Get routing by ID
   */
  get(id: string): TaskRouting {
    const routing = routingRepository.findById(id)
    if (!routing) {
      throw new NotFoundError(`Routing not found: ${id}`)
    }
    return routing
  },

  /**
   * Get routing by task ID
   */
  getByTaskId(taskId: string): TaskRouting | null {
    return routingRepository.findByTaskId(taskId)
  },

  /**
   * Trigger routing for a task
   * Creates or resumes routing state and starts execution
   */
  async trigger(taskId: string): Promise<TaskRouting> {
    // Verify task exists
    const task = taskRepository.findById(taskId)
    if (!task) {
      throw new NotFoundError(`Task not found: ${taskId}`)
    }

    // Get or create routing state
    let routing = routingRepository.findByTaskId(taskId)

    if (routing) {
      // Check if already completed or failed
      if (routing.status === 'completed' || routing.status === 'failed') {
        // Reset for a new round
        routing = routingRepository.update(routing.id, {
          status: 'pending',
          currentAgentIndex: 0,
          iteration: 0,
          anyAgentWorked: false,
          errorMessage: null,
          retryCount: 0,
        })!
      }
    } else {
      // Create new routing state
      routing = routingRepository.create({ taskId })
    }

    // Try to acquire lock
    if (!routingRepository.lock(routing.id)) {
      log.warn('Routing is already locked', { taskId, routingId: routing.id })
      return routing
    }

    // Update task status to in_progress
    taskRepository.updateStatus(taskId, 'in_progress')
    emitTaskUpdated({
      id: taskId,
      workspaceId: task.workspaceId,
      changes: { status: 'in_progress' },
    })

    // Update routing to running
    routing = routingRepository.update(routing.id, { status: 'running' })!
    this.emitRoutingUpdate(routing)

    // Start the execution loop in the background
    this.runExecutionLoop(routing.id, taskId).catch((error) => {
      log.error('Execution loop failed', {
        routingId: routing!.id,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      })
    })

    return routing
  },

  /**
   * Cancel routing for a task
   */
  async cancel(taskId: string): Promise<TaskRouting | null> {
    const routing = routingRepository.findByTaskId(taskId)
    if (!routing) {
      return null
    }

    // Cancel any running executions
    executorService.cancelByTask(taskId)

    // Update routing status
    const updated = routingRepository.update(routing.id, {
      status: 'failed',
      errorMessage: 'Cancelled by user',
    })

    if (updated) {
      routingRepository.unlock(routing.id)
      this.emitRoutingUpdate(updated)

      // Update task status to todo
      taskRepository.updateStatus(taskId, 'todo')
      const task = taskRepository.findById(taskId)
      if (task) {
        emitTaskUpdated({
          id: taskId,
          workspaceId: task.workspaceId,
          changes: { status: 'todo' },
        })
      }

      // Add system comment
      commentRepository.create(taskId, {
        author: 'System',
        authorType: 'system',
        content: 'Task routing cancelled by user',
      })
    }

    return updated
  },

  /**
   * Find pending routings (for recovery)
   */
  findPending(): TaskRouting[] {
    return routingRepository.findPending()
  },

  /**
   * Resume routing from a previous state (for recovery)
   */
  async resume(routingId: string): Promise<void> {
    const routing = routingRepository.findById(routingId)
    if (!routing) {
      log.warn('Cannot resume: routing not found', { routingId })
      return
    }

    if (routing.status !== 'pending' && routing.status !== 'running') {
      log.debug('Routing already in terminal state', {
        routingId,
        status: routing.status,
      })
      return
    }

    // Try to acquire lock
    if (!routingRepository.lock(routingId)) {
      log.debug('Routing already locked', { routingId })
      return
    }

    log.info('Resuming routing', {
      routingId,
      taskId: routing.taskId,
      iteration: routing.iteration,
      agentIndex: routing.currentAgentIndex,
    })

    // Start the execution loop
    this.runExecutionLoop(routingId, routing.taskId).catch((error) => {
      log.error('Resumed execution loop failed', {
        routingId,
        taskId: routing.taskId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  },

  /**
   * Delete routing by task ID
   */
  delete(taskId: string): boolean {
    return routingRepository.deleteByTaskId(taskId)
  },

  /**
   * Run the main execution loop for routing
   * This method handles the sequential execution of agents
   */
  async runExecutionLoop(routingId: string, taskId: string): Promise<void> {
    try {
      const task = taskRepository.findById(taskId)
      if (!task) {
        throw new Error(`Task not found: ${taskId}`)
      }

      // Get all agents for the workspace
      const agents = agentRepository.findByWorkspaceId(task.workspaceId)

      if (agents.length === 0) {
        log.info('No agents configured, completing routing', {
          routingId,
          taskId,
        })
        await this.completeRouting(routingId, taskId)
        return
      }

      // Execute agents until convergence
      let continueLoop = true

      while (continueLoop) {
        const routing = routingRepository.findById(routingId)
        if (!routing || routing.status !== 'running') {
          log.debug('Routing no longer active', { routingId })
          break
        }

        const currentIndex = routing.currentAgentIndex

        // Check if we've completed all agents in this iteration
        if (currentIndex >= agents.length) {
          // End of iteration - check if any agent worked
          if (routing.anyAgentWorked) {
            // Start a new iteration
            log.info('Starting new iteration', {
              routingId,
              taskId,
              iteration: routing.iteration + 1,
            })
            routingRepository.startNewIteration(routingId)
            this.emitRoutingUpdate(routingRepository.findById(routingId)!)
            continue
          } else {
            // No agent worked - routing complete
            log.info('No agent worked in iteration, completing', {
              routingId,
              taskId,
              iteration: routing.iteration,
            })
            await this.completeRouting(routingId, taskId)
            continueLoop = false
            continue
          }
        }

        const agent = agents[currentIndex]!
        log.info('Executing agent', {
          routingId,
          taskId,
          agentId: agent.id,
          agentName: agent.name,
          iteration: routing.iteration,
          agentIndex: currentIndex,
        })

        // Execute the agent
        const result = await this.executeAgent(routingId, taskId, agent)

        // Handle the result
        if (result.success) {
          // Reset retry count and advance to next agent
          routingRepository.resetRetryCount(routingId)

          if (result.worked) {
            routingRepository.markAgentWorked(routingId)
          }

          routingRepository.advanceToNextAgent(routingId)
          this.emitRoutingUpdate(routingRepository.findById(routingId)!)
        } else {
          // Handle failure
          if (result.shouldRetry && routing.retryCount < MAX_RETRIES) {
            // Retry the same agent
            log.info('Retrying agent', {
              routingId,
              taskId,
              agentId: agent.id,
              retryCount: routing.retryCount + 1,
            })
            routingRepository.incrementRetryCount(routingId)
            // Small delay before retry
            await new Promise((resolve) => setTimeout(resolve, 1000))
          } else {
            // Max retries exceeded or non-retryable error
            log.warn('Agent failed, continuing to next', {
              routingId,
              taskId,
              agentId: agent.id,
              retryCount: routing.retryCount,
              error: result.error,
            })

            // Add error comment
            commentRepository.create(taskId, {
              author: 'System',
              authorType: 'system',
              content: `Agent "${agent.name}" failed: ${result.error ?? 'Unknown error'}`,
            })

            // Continue to next agent (failure counts as "worked" to avoid infinite loops)
            routingRepository.markAgentWorked(routingId)
            routingRepository.resetRetryCount(routingId)
            routingRepository.advanceToNextAgent(routingId)
            this.emitRoutingUpdate(routingRepository.findById(routingId)!)
          }
        }
      }
    } catch (error) {
      log.error('Execution loop error', {
        routingId,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      })
      await this.failRouting(routingId, taskId, error instanceof Error ? error.message : String(error))
    } finally {
      // Always unlock
      routingRepository.unlock(routingId)
    }
  },

  /**
   * Execute a single agent for a task
   */
  async executeAgent(
    _routingId: string,
    taskId: string,
    agent: Agent
  ): Promise<{
    success: boolean
    worked: boolean
    shouldRetry: boolean
    error?: string
  }> {
    try {
      // Create execution record
      const execution = executionService.create({
        taskId,
        agentId: agent.id,
        agentName: agent.name,
      })

      // Emit execution created event
      emitExecutionCreated({
        id: execution.id,
        taskId,
        agentId: agent.id,
        agentName: agent.name,
        status: execution.status,
      })

      // Build execution context
      const context = executorService.buildContext(execution, taskId, agent.id)
      if (!context) {
        return {
          success: false,
          worked: false,
          shouldRetry: false,
          error: 'Failed to build execution context',
        }
      }

      // Execute
      const result = await executorService.execute(context)

      // Handle result based on execution status and result
      if (result.status === 'completed') {
        if (result.result === 'comment') {
          // Agent made a comment - create comment record
          commentRepository.create(taskId, {
            author: agent.name,
            authorType: 'agent',
            content: result.output ?? 'Agent comment',
          })
          return { success: true, worked: true, shouldRetry: false }
        } else if (result.result === 'skip') {
          // Agent skipped - no work done
          return { success: true, worked: false, shouldRetry: false }
        } else {
          // Error result
          return { success: true, worked: true, shouldRetry: false }
        }
      } else if (result.status === 'failed') {
        // Check if this was a timeout (counts as worked)
        if (result.output?.includes('timeout') || result.output?.includes('terminated')) {
          commentRepository.create(taskId, {
            author: 'System',
            authorType: 'system',
            content: `Agent "${agent.name}" timed out`,
          })
          return { success: true, worked: true, shouldRetry: false }
        }
        // Other failures should retry
        return {
          success: false,
          worked: false,
          shouldRetry: true,
          error: result.output ?? 'Execution failed',
        }
      }

      return { success: true, worked: false, shouldRetry: false }
    } catch (error) {
      return {
        success: false,
        worked: false,
        shouldRetry: true,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },

  /**
   * Complete routing successfully
   */
  async completeRouting(routingId: string, taskId: string): Promise<void> {
    routingRepository.update(routingId, {
      status: 'completed',
    })

    const routing = routingRepository.findById(routingId)
    if (routing) {
      this.emitRoutingUpdate(routing)
    }

    // Update task status to in_review
    taskRepository.updateStatus(taskId, 'in_review')
    const task = taskRepository.findById(taskId)
    if (task) {
      emitTaskUpdated({
        id: taskId,
        workspaceId: task.workspaceId,
        changes: { status: 'in_review' },
      })
    }

    // Add system comment
    commentRepository.create(taskId, {
      author: 'System',
      authorType: 'system',
      content: 'Task routing completed - awaiting review',
    })
  },

  /**
   * Mark routing as failed
   */
  async failRouting(
    routingId: string,
    taskId: string,
    error: string
  ): Promise<void> {
    routingRepository.update(routingId, {
      status: 'failed',
      errorMessage: error,
    })

    const routing = routingRepository.findById(routingId)
    if (routing) {
      this.emitRoutingUpdate(routing)
    }

    // Update task status to todo (so it can be retried)
    taskRepository.updateStatus(taskId, 'todo')
    const task = taskRepository.findById(taskId)
    if (task) {
      emitTaskUpdated({
        id: taskId,
        workspaceId: task.workspaceId,
        changes: { status: 'todo' },
      })
    }

    // Add system comment
    commentRepository.create(taskId, {
      author: 'System',
      authorType: 'system',
      content: `Task routing failed: ${error}`,
    })
  },

  /**
   * Emit routing updated event
   */
  emitRoutingUpdate(routing: TaskRouting): void {
    emitRoutingUpdated({
      taskId: routing.taskId,
      status: routing.status,
      currentAgentIndex: routing.currentAgentIndex,
      iteration: routing.iteration,
    })
  },
}
