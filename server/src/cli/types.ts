/**
 * CLI Module - Types
 *
 * Type definitions for CLI command parsing and execution.
 */

import type { CliArgs } from '../modules/core'

export type Command = 'help' | 'version' | 'export' | 'import' | 'serve'

export interface ParsedArgs {
  command: Command
  cliArgs: CliArgs
  // Export command options
  output?: string
  workspace?: string
  // Import command options
  importFile?: string
}

// Export format as specified in STANDALONE.md
export interface ExportData {
  version: string
  exportedAt: string
  workspaces: ExportedWorkspace[]
}

export interface ExportedWorkspace {
  id: string
  name: string
  settings: ExportedSetting[]
  agents: ExportedAgent[]
  templates: ExportedTemplate[]
  tasks: ExportedTask[]
}

export interface ExportedSetting {
  key: string
  value: unknown
}

export interface ExportedAgent {
  id: string
  name: string
  roleInstruction: string | null
  workingInstruction: string | null
  order: number
  timeoutMinutes: number | null
}

export interface ExportedTemplate {
  id: string
  name: string
  title: string
  description: string | null
  order: number
}

export interface ExportedTask {
  id: string
  title: string
  description: string | null
  status: string
  comments: ExportedComment[]
}

export interface ExportedComment {
  author: string
  authorType: string
  content: string
  log: string | null
}
