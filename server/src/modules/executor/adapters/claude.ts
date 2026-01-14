/**
 * Executor Module - Claude CLI Adapter
 *
 * Handles spawning and interacting with the Claude CLI process.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { getConfig, log, safeJsonParse } from '../../core'
import type { TaskOutput } from '../types'

/**
 * Options for spawning the Claude CLI
 */
export interface ClaudeSpawnOptions {
  /** Working directory for the CLI process */
  workspacePath: string
  /** Path to the input file */
  inputPath: string
  /** Callback for stdout data */
  onStdout?: (data: string) => void
  /** Callback for stderr data */
  onStderr?: (data: string) => void
  /** Callback for parsed content from stream-json output */
  onContent?: (content: string) => void
}

/**
 * Result from spawning the Claude CLI
 */
export interface ClaudeSpawnResult {
  process: ChildProcess
  promise: Promise<ClaudeExitResult>
}

/**
 * Result when the Claude CLI exits
 */
export interface ClaudeExitResult {
  code: number | null
  signal: NodeJS.Signals | null
  killed: boolean
}

/**
 * Parsed content from Claude CLI stream-json output
 */
interface StreamJsonMessage {
  type: string
  content?: string
  message?: {
    content?: Array<{
      type: string
      text?: string
    }>
  }
}

/**
 * Get the path to the Claude CLI executable
 */
export function getClaudePath(): string {
  const config = getConfig()
  // Use configured path or default to 'claude' (assumes it's in PATH)
  return config.claudePath ?? 'claude'
}

/**
 * Check if the Claude CLI is available
 */
export async function isClaudeAvailable(): Promise<boolean> {
  const claudePath = getClaudePath()

  return new Promise((resolve) => {
    const proc = spawn(claudePath, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })

    proc.on('error', () => {
      resolve(false)
    })

    proc.on('close', (code) => {
      resolve(code === 0)
    })
  })
}

/**
 * Get the Claude CLI version
 */
export async function getClaudeVersion(): Promise<string | null> {
  const claudePath = getClaudePath()

  return new Promise((resolve) => {
    let output = ''

    const proc = spawn(claudePath, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000,
    })

    proc.stdout?.on('data', (data) => {
      output += data.toString()
    })

    proc.on('error', () => {
      resolve(null)
    })

    proc.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim())
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Parse a line of stream-json output from Claude CLI
 */
function parseStreamJsonLine(line: string): StreamJsonMessage | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const parsed = safeJsonParse<StreamJsonMessage>(trimmed)
  return parsed ?? null
}

/**
 * Extract content text from a stream-json message
 */
function extractContentFromMessage(msg: StreamJsonMessage): string | null {
  // Handle assistant message with content array
  if (msg.type === 'assistant' && msg.message?.content) {
    const textBlocks = msg.message.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text!)

    if (textBlocks.length > 0) {
      return textBlocks.join('\n')
    }
  }

  // Handle content_block_delta for streaming text
  if (msg.type === 'content_block_delta' && msg.content) {
    return msg.content
  }

  return null
}

/**
 * Spawn the Claude CLI process
 */
export function spawnClaude(options: ClaudeSpawnOptions): ClaudeSpawnResult {
  const { workspacePath, inputPath, onStdout, onStderr, onContent } = options
  const claudePath = getClaudePath()

  // Build the CLI arguments
  const args = [
    '--output-format', 'stream-json',
    '--verbose',
    '-p',
    '--dangerously-skip-permissions',
  ]

  log.debug('Spawning Claude CLI', { claudePath, args, workspacePath })

  // Spawn the process
  const proc = spawn(claudePath, args, {
    cwd: workspacePath,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      // Ensure the CLI doesn't try to open a browser
      BROWSER: 'none',
    },
  })

  // Send the input command via stdin
  const stdinCommand = `Read ${inputPath} and follow the instructions in fully autonomous mode.`
  proc.stdin?.write(stdinCommand)
  proc.stdin?.end()

  // Handle stdout - parse stream-json output
  let stdoutBuffer = ''
  proc.stdout?.on('data', (data) => {
    const chunk = data.toString()
    stdoutBuffer += chunk

    // Call the raw stdout callback
    if (onStdout) {
      onStdout(chunk)
    }

    // Parse complete lines
    const lines = stdoutBuffer.split('\n')
    stdoutBuffer = lines.pop() ?? '' // Keep incomplete line in buffer

    for (const line of lines) {
      const msg = parseStreamJsonLine(line)
      if (msg && onContent) {
        const content = extractContentFromMessage(msg)
        if (content) {
          onContent(content)
        }
      }
    }
  })

  // Handle stderr
  proc.stderr?.on('data', (data) => {
    const chunk = data.toString()
    if (onStderr) {
      onStderr(chunk)
    }
  })

  // Create a promise that resolves when the process exits
  const promise = new Promise<ClaudeExitResult>((resolve) => {
    proc.on('error', (error) => {
      log.error('Claude CLI process error', { error: error.message })
      resolve({
        code: null,
        signal: null,
        killed: false,
      })
    })

    proc.on('close', (code, signal) => {
      log.debug('Claude CLI process closed', { code, signal })
      resolve({
        code,
        signal,
        killed: proc.killed,
      })
    })
  })

  return { process: proc, promise }
}

/**
 * Read and parse the task output file
 */
export function parseTaskOutput(outputPath: string): TaskOutput | null {
  try {
    const content = readFileSync(outputPath, 'utf-8')
    const parsed = safeJsonParse<TaskOutput>(content)

    if (!parsed) {
      log.warn('Failed to parse task output', { outputPath })
      return null
    }

    // Validate the result field
    if (!['skip', 'comment', 'error'].includes(parsed.result)) {
      log.warn('Invalid result in task output', { result: parsed.result })
      return null
    }

    return parsed
  } catch (error) {
    log.debug('Task output file not found or unreadable', { outputPath })
    return null
  }
}

/**
 * Create the task input JSON content
 */
export function createTaskInputContent(
  task: {
    id: string
    title: string
    description: string | null
    status: string
  },
  workspace: {
    id: string
    name: string
    instruction: string | null
  },
  agent: {
    id: string
    name: string
    roleInstruction: string | null
    workingInstruction: string | null
  },
  comments: Array<{
    author: string
    authorType: string
    content: string
    createdAt: number
  }>,
  attachments: Array<{
    filename: string
    path: string
  }>
): string {
  const input = {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      instruction: workspace.instruction,
    },
    agent: {
      id: agent.id,
      name: agent.name,
      roleInstruction: agent.roleInstruction,
      workingInstruction: agent.workingInstruction,
    },
    comments,
    attachments,
  }

  return JSON.stringify(input, null, 2)
}
