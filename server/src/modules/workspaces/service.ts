/**
 * Workspaces Module - Service
 *
 * Business logic for workspace operations.
 */

import { NotFoundError, ValidationError, ConflictError, log } from '../core'
import { workspaceRepository, settingsRepository } from './repository'
import { taskRepository } from '../tasks/repository'
import { executorService } from '../executor/service'
import { routingService } from '../routing/service'
import type {
  WorkspaceWithSettings,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceListParams,
  WorkspaceListResponse,
} from './types'

export const workspaceService = {
  /**
   * List workspaces with pagination and optional search
   */
  list(params?: WorkspaceListParams): WorkspaceListResponse {
    const { workspaces, total } = workspaceRepository.findAllPaginated(params)
    const data = workspaces.map((workspace) => ({
      ...workspace,
      settings: settingsRepository.findByWorkspaceId(workspace.id),
    }))
    return { data, total }
  },

  /**
   * Get a workspace by ID with settings
   */
  get(id: string): WorkspaceWithSettings {
    const workspace = workspaceRepository.findById(id)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${id}`)
    }

    return {
      ...workspace,
      settings: settingsRepository.findByWorkspaceId(id),
    }
  },

  /**
   * Create a new workspace
   */
  create(data: CreateWorkspaceInput): WorkspaceWithSettings {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Workspace name is required', {
        name: 'Name is required',
      })
    }

    const workspace = workspaceRepository.create({
      name: data.name.trim(),
    })

    return {
      ...workspace,
      settings: {},
    }
  },

  /**
   * Update a workspace
   */
  update(id: string, data: UpdateWorkspaceInput): WorkspaceWithSettings {
    // Validate name if provided
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError('Workspace name cannot be empty', {
        name: 'Name cannot be empty',
      })
    }

    const updateData: UpdateWorkspaceInput = {}
    if (data.name) {
      updateData.name = data.name.trim()
    }

    const workspace = workspaceRepository.update(id, updateData)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${id}`)
    }

    return {
      ...workspace,
      settings: settingsRepository.findByWorkspaceId(id),
    }
  },

  /**
   * Delete a workspace
   * @param id - Workspace ID
   * @param force - If true, cancel in-progress tasks before deletion
   */
  async delete(id: string, force: boolean = false): Promise<void> {
    const exists = workspaceRepository.findById(id)
    if (!exists) {
      throw new NotFoundError(`Workspace not found: ${id}`)
    }

    // Check for in-progress tasks
    const inProgressTasks = taskRepository.findByWorkspaceId(id, {
      status: 'in_progress',
    })

    if (inProgressTasks.length > 0) {
      if (!force) {
        throw new ConflictError(
          `Cannot delete workspace with ${inProgressTasks.length} in-progress task(s). Use force=true to cancel them.`,
          { inProgressTaskCount: inProgressTasks.length }
        )
      }

      // Force mode: cancel all running executions for this workspace
      log.info('Force deleting workspace with in-progress tasks', {
        workspaceId: id,
        taskCount: inProgressTasks.length,
      })

      for (const task of inProgressTasks) {
        // Cancel routing and executions for each task
        await routingService.cancel(task.id)
        executorService.cancelByTask(task.id)
      }

      // Small delay to allow processes to terminate
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    workspaceRepository.delete(id)
  },

  /**
   * Get all settings for a workspace
   */
  getSettings(workspaceId: string): Record<string, unknown> {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    return settingsRepository.findByWorkspaceId(workspaceId)
  },

  /**
   * Set a setting for a workspace
   */
  setSetting(workspaceId: string, key: string, value: unknown): void {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    settingsRepository.set(workspaceId, key, value)
  },

  /**
   * Delete a setting from a workspace
   */
  deleteSetting(workspaceId: string, key: string): void {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    const deleted = settingsRepository.delete(workspaceId, key)
    if (!deleted) {
      throw new NotFoundError(`Setting not found: ${key}`)
    }
  },
}
