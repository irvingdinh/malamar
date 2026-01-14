/**
 * Templates Module - Service
 *
 * Business logic for task template operations.
 */

import { NotFoundError, ValidationError } from '../core'
import { workspaceRepository } from '../workspaces/repository'
import { templateRepository } from './repository'
import type { TaskTemplate, CreateTemplateInput, UpdateTemplateInput } from './types'

export const templateService = {
  /**
   * List all templates for a workspace
   */
  listByWorkspace(workspaceId: string): TaskTemplate[] {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    return templateRepository.findByWorkspaceId(workspaceId)
  },

  /**
   * Get a template by ID
   */
  get(id: string): TaskTemplate {
    const template = templateRepository.findById(id)
    if (!template) {
      throw new NotFoundError(`Template not found: ${id}`)
    }
    return template
  },

  /**
   * Create a new template
   */
  create(workspaceId: string, data: CreateTemplateInput): TaskTemplate {
    // Verify workspace exists
    const workspace = workspaceRepository.findById(workspaceId)
    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${workspaceId}`)
    }

    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Template name is required', {
        name: 'Name is required',
      })
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Template title is required', {
        title: 'Title is required',
      })
    }

    return templateRepository.create(workspaceId, {
      name: data.name.trim(),
      title: data.title.trim(),
      description: data.description?.trim() || null,
    })
  },

  /**
   * Update a template
   */
  update(workspaceId: string, templateId: string, data: UpdateTemplateInput): TaskTemplate {
    // Verify template exists and belongs to workspace
    const template = templateRepository.findById(templateId)
    if (!template) {
      throw new NotFoundError(`Template not found: ${templateId}`)
    }
    if (template.workspaceId !== workspaceId) {
      throw new NotFoundError(`Template not found in workspace: ${templateId}`)
    }

    // Validate name if provided
    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new ValidationError('Template name cannot be empty', {
        name: 'Name cannot be empty',
      })
    }

    // Validate title if provided
    if (data.title !== undefined && data.title.trim().length === 0) {
      throw new ValidationError('Template title cannot be empty', {
        title: 'Title cannot be empty',
      })
    }

    const updateData: UpdateTemplateInput = {}
    if (data.name !== undefined) {
      updateData.name = data.name.trim()
    }
    if (data.title !== undefined) {
      updateData.title = data.title.trim()
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null
    }

    const updated = templateRepository.update(templateId, updateData)
    if (!updated) {
      throw new NotFoundError(`Template not found: ${templateId}`)
    }

    return updated
  },

  /**
   * Delete a template
   */
  delete(workspaceId: string, templateId: string): void {
    // Verify template exists and belongs to workspace
    const template = templateRepository.findById(templateId)
    if (!template) {
      throw new NotFoundError(`Template not found: ${templateId}`)
    }
    if (template.workspaceId !== workspaceId) {
      throw new NotFoundError(`Template not found in workspace: ${templateId}`)
    }

    templateRepository.delete(templateId)

    // Recompute order for remaining templates
    templateRepository.recomputeOrder(workspaceId)
  },
}
