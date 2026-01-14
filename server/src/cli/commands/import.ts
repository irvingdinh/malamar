/**
 * CLI Command - Import
 *
 * Import workspaces from JSON format.
 * - Preserves original IDs
 * - Fails on ID collision (does not overwrite)
 * - Duplicate names are allowed
 */

import { existsSync, readFileSync } from 'node:fs'
import {
  initConfig,
  initDatabase,
  closeDatabase,
  getDb,
  generateId,
  now,
  initLogger,
} from '../../modules/core'
import type {
  ParsedArgs,
  ExportData,
  ExportedWorkspace,
  ExportedAgent,
  ExportedTemplate,
  ExportedTask,
  ExportedComment,
} from '../types'

/**
 * Import workspaces from a JSON file.
 */
export async function runImportCommand(args: ParsedArgs): Promise<void> {
  if (!args.importFile) {
    console.error('Error: No import file specified')
    console.error('Usage: malamar import <file>')
    process.exit(1)
  }

  if (!existsSync(args.importFile)) {
    console.error(`Error: File not found: ${args.importFile}`)
    process.exit(1)
  }

  // Read and parse file
  let importData: ExportData
  try {
    const content = readFileSync(args.importFile, 'utf-8')
    importData = JSON.parse(content)
  } catch (error) {
    console.error(`Error: Failed to parse import file: ${error}`)
    process.exit(1)
  }

  // Validate format
  if (!importData.version || !importData.workspaces) {
    console.error('Error: Invalid import file format')
    process.exit(1)
  }

  if (importData.version !== '1.0') {
    console.error(`Error: Unsupported export format version: ${importData.version}`)
    process.exit(1)
  }

  // Initialize config and database
  const config = initConfig(args.cliArgs)
  initLogger({
    format: config.logFormat,
    level: 'error', // Suppress info logs for CLI command
  })
  await initDatabase(config.dataDir)

  try {
    const db = getDb()

    // Check for ID collisions before importing
    const collisions = checkCollisions(db, importData)
    if (collisions.length > 0) {
      console.error('Error: ID collisions detected. Import aborted.')
      console.error('Conflicting IDs:')
      for (const collision of collisions) {
        console.error(`  - ${collision.type}: ${collision.id}`)
      }
      process.exit(1)
    }

    // Import in a transaction
    let workspacesImported = 0
    let agentsImported = 0
    let templatesImported = 0
    let tasksImported = 0
    let commentsImported = 0

    db.transaction(() => {
      for (const workspace of importData.workspaces) {
        const stats = importWorkspace(db, workspace)
        workspacesImported++
        agentsImported += stats.agents
        templatesImported += stats.templates
        tasksImported += stats.tasks
        commentsImported += stats.comments
      }
    })()

    console.log('Import completed successfully:')
    console.log(`  - Workspaces: ${workspacesImported}`)
    console.log(`  - Agents: ${agentsImported}`)
    console.log(`  - Templates: ${templatesImported}`)
    console.log(`  - Tasks: ${tasksImported}`)
    console.log(`  - Comments: ${commentsImported}`)
  } finally {
    closeDatabase()
  }
}

interface Collision {
  type: 'workspace' | 'agent' | 'template' | 'task'
  id: string
}

function checkCollisions(
  db: ReturnType<typeof getDb>,
  data: ExportData
): Collision[] {
  const collisions: Collision[] = []

  for (const workspace of data.workspaces) {
    // Check workspace ID
    const wsExists = db
      .query<{ id: string }, [string]>('SELECT id FROM workspaces WHERE id = ?')
      .get(workspace.id)
    if (wsExists) {
      collisions.push({ type: 'workspace', id: workspace.id })
    }

    // Check agent IDs
    for (const agent of workspace.agents) {
      const agentExists = db
        .query<{ id: string }, [string]>('SELECT id FROM agents WHERE id = ?')
        .get(agent.id)
      if (agentExists) {
        collisions.push({ type: 'agent', id: agent.id })
      }
    }

    // Check template IDs
    for (const template of workspace.templates) {
      const templateExists = db
        .query<{ id: string }, [string]>(
          'SELECT id FROM task_templates WHERE id = ?'
        )
        .get(template.id)
      if (templateExists) {
        collisions.push({ type: 'template', id: template.id })
      }
    }

    // Check task IDs
    for (const task of workspace.tasks) {
      const taskExists = db
        .query<{ id: string }, [string]>('SELECT id FROM tasks WHERE id = ?')
        .get(task.id)
      if (taskExists) {
        collisions.push({ type: 'task', id: task.id })
      }
    }
  }

  return collisions
}

interface ImportStats {
  agents: number
  templates: number
  tasks: number
  comments: number
}

function importWorkspace(
  db: ReturnType<typeof getDb>,
  workspace: ExportedWorkspace
): ImportStats {
  const timestamp = now()
  const stats: ImportStats = {
    agents: 0,
    templates: 0,
    tasks: 0,
    comments: 0,
  }

  // Insert workspace
  db.run(
    'INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [workspace.id, workspace.name, timestamp, timestamp]
  )

  // Insert settings
  for (const setting of workspace.settings) {
    const settingId = generateId()
    const value = JSON.stringify(setting.value)
    db.run(
      `INSERT INTO workspace_settings (id, workspace_id, key, value, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [settingId, workspace.id, setting.key, value, timestamp, timestamp]
    )
  }

  // Insert agents
  for (const agent of workspace.agents) {
    importAgent(db, workspace.id, agent, timestamp)
    stats.agents++
  }

  // Insert templates
  for (const template of workspace.templates) {
    importTemplate(db, workspace.id, template, timestamp)
    stats.templates++
  }

  // Insert tasks with comments
  for (const task of workspace.tasks) {
    const commentCount = importTask(db, workspace.id, task, timestamp)
    stats.tasks++
    stats.comments += commentCount
  }

  return stats
}

function importAgent(
  db: ReturnType<typeof getDb>,
  workspaceId: string,
  agent: ExportedAgent,
  timestamp: number
): void {
  db.run(
    `INSERT INTO agents (id, workspace_id, name, role_instruction, working_instruction, "order", timeout_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      agent.id,
      workspaceId,
      agent.name,
      agent.roleInstruction,
      agent.workingInstruction,
      agent.order,
      agent.timeoutMinutes,
      timestamp,
      timestamp,
    ]
  )
}

function importTemplate(
  db: ReturnType<typeof getDb>,
  workspaceId: string,
  template: ExportedTemplate,
  timestamp: number
): void {
  db.run(
    `INSERT INTO task_templates (id, workspace_id, name, title, description, "order", created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      workspaceId,
      template.name,
      template.title,
      template.description,
      template.order,
      timestamp,
      timestamp,
    ]
  )
}

function importTask(
  db: ReturnType<typeof getDb>,
  workspaceId: string,
  task: ExportedTask,
  timestamp: number
): number {
  // Insert task
  db.run(
    `INSERT INTO tasks (id, workspace_id, title, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      workspaceId,
      task.title,
      task.description,
      task.status,
      timestamp,
      timestamp,
    ]
  )

  // Insert comments
  for (const comment of task.comments) {
    importComment(db, task.id, comment, timestamp)
  }

  return task.comments.length
}

function importComment(
  db: ReturnType<typeof getDb>,
  taskId: string,
  comment: ExportedComment,
  timestamp: number
): void {
  const commentId = generateId()
  db.run(
    `INSERT INTO comments (id, task_id, author, author_type, content, log, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      commentId,
      taskId,
      comment.author,
      comment.authorType,
      comment.content,
      comment.log,
      timestamp,
    ]
  )
}
