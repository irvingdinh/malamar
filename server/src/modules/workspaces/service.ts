/**
 * Workspaces Module - Service
 *
 * Business logic for workspace operations.
 */

import { NotFoundError, ValidationError } from '../core'
import { workspaceRepository, settingsRepository } from './repository'
import type {
  WorkspaceWithSettings,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from './types'

export const workspaceService = {
  /**
   * List all workspaces with settings eager-loaded
   */
  list(): WorkspaceWithSettings[] {
    const workspaces = workspaceRepository.findAll()
    return workspaces.map((workspace) => ({
      ...workspace,
      settings: settingsRepository.findByWorkspaceId(workspace.id),
    }))
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
   */
  delete(id: string): void {
    const exists = workspaceRepository.findById(id)
    if (!exists) {
      throw new NotFoundError(`Workspace not found: ${id}`)
    }

    // TODO: Cancel any in-progress tasks before deletion
    // This will be implemented when the executor module is ready

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
