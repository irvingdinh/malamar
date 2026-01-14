/**
 * CLI Command - Export
 *
 * Export workspaces to JSON format.
 * Excludes: attachments, executions, execution_logs, task_routings
 */

import { writeFileSync } from 'node:fs'
import { initConfig, initDatabase, closeDatabase, getDb, initLogger } from '../../modules/core'
import type { ParsedArgs, ExportData, ExportedWorkspace } from '../types'

interface WorkspaceRow {
  id: string
  name: string
}

interface SettingRow {
  key: string
  value: string
}

interface AgentRow {
  id: string
  name: string
  role_instruction: string | null
  working_instruction: string | null
  order: number
  timeout_minutes: number | null
}

interface TemplateRow {
  id: string
  name: string
  title: string
  description: string | null
  order: number
}

interface TaskRow {
  id: string
  title: string
  description: string | null
  status: string
}

interface CommentRow {
  author: string
  author_type: string
  content: string
  log: string | null
}

/**
 * Export all workspaces or a single workspace to JSON.
 */
export async function runExportCommand(args: ParsedArgs): Promise<void> {
  // Initialize config and database
  // Use error level logging to avoid polluting stdout when output goes to stdout
  const config = initConfig(args.cliArgs)
  initLogger({
    format: config.logFormat,
    level: args.output ? config.logLevel : 'error',
  })
  await initDatabase(config.dataDir)

  try {
    const db = getDb()

    // Get workspaces to export
    let workspaceRows: WorkspaceRow[]
    if (args.workspace) {
      const row = db
        .query<WorkspaceRow, [string]>(
          'SELECT id, name FROM workspaces WHERE id = ?'
        )
        .get(args.workspace)
      if (!row) {
        console.error(`Error: Workspace '${args.workspace}' not found`)
        process.exit(1)
      }
      workspaceRows = [row]
    } else {
      workspaceRows = db
        .query<WorkspaceRow, []>('SELECT id, name FROM workspaces ORDER BY name')
        .all()
    }

    // Build export data
    const exportData: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workspaces: [],
    }

    for (const workspace of workspaceRows) {
      const exportedWorkspace = exportWorkspace(db, workspace)
      exportData.workspaces.push(exportedWorkspace)
    }

    // Output
    const jsonOutput = JSON.stringify(exportData, null, 2)

    if (args.output) {
      writeFileSync(args.output, jsonOutput)
      console.error(`Exported ${exportData.workspaces.length} workspace(s) to ${args.output}`)
    } else {
      console.log(jsonOutput)
    }
  } finally {
    closeDatabase()
  }
}

function exportWorkspace(
  db: ReturnType<typeof getDb>,
  workspace: WorkspaceRow
): ExportedWorkspace {
  // Get settings
  const settingRows = db
    .query<SettingRow, [string]>(
      'SELECT key, value FROM workspace_settings WHERE workspace_id = ?'
    )
    .all(workspace.id)

  const settings = settingRows.map((row) => ({
    key: row.key,
    value: safeJsonParse(row.value),
  }))

  // Get agents
  const agentRows = db
    .query<AgentRow, [string]>(
      `SELECT id, name, role_instruction, working_instruction, "order", timeout_minutes
       FROM agents WHERE workspace_id = ? ORDER BY "order" ASC`
    )
    .all(workspace.id)

  const agents = agentRows.map((row) => ({
    id: row.id,
    name: row.name,
    roleInstruction: row.role_instruction,
    workingInstruction: row.working_instruction,
    order: row.order,
    timeoutMinutes: row.timeout_minutes,
  }))

  // Get templates
  const templateRows = db
    .query<TemplateRow, [string]>(
      `SELECT id, name, title, description, "order"
       FROM task_templates WHERE workspace_id = ? ORDER BY "order" ASC`
    )
    .all(workspace.id)

  const templates = templateRows.map((row) => ({
    id: row.id,
    name: row.name,
    title: row.title,
    description: row.description,
    order: row.order,
  }))

  // Get tasks with comments
  const taskRows = db
    .query<TaskRow, [string]>(
      'SELECT id, title, description, status FROM tasks WHERE workspace_id = ? ORDER BY created_at ASC'
    )
    .all(workspace.id)

  const tasks = taskRows.map((task) => {
    const commentRows = db
      .query<CommentRow, [string]>(
        'SELECT author, author_type, content, log FROM comments WHERE task_id = ? ORDER BY created_at ASC'
      )
      .all(task.id)

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      comments: commentRows.map((c) => ({
        author: c.author,
        authorType: c.author_type,
        content: c.content,
        log: c.log,
      })),
    }
  })

  return {
    id: workspace.id,
    name: workspace.name,
    settings,
    agents,
    templates,
    tasks,
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
