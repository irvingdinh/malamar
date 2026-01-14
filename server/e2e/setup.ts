/**
 * E2E Test Setup and Utilities
 *
 * Provides test helpers for end-to-end testing with a real HTTP server.
 * This enables testing actual CLI executions (Claude Code, etc.)
 */

import { serve, type Server } from 'bun'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app } from '../src/app'
import { initConfig, initDatabase, closeDatabase, initLogger } from '../src/modules/core'

// Test data directory - isolated from production
let TEST_DATA_DIR: string

// Real HTTP server instance
let server: Server | null = null

// Server URL (assigned after server starts)
let serverUrl: string = ''

// Track if environment is initialized
let isInitialized = false

/**
 * Get the running server URL
 */
export function getServerUrl(): string {
  if (!serverUrl) {
    throw new Error('E2E server not started. Call setupE2EEnvironment() first.')
  }
  return serverUrl
}

/**
 * Check if Claude Code CLI is available
 */
export async function isClaudeAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(['claude', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const exitCode = await proc.exited
    return exitCode === 0
  } catch {
    return false
  }
}

/**
 * Initialize E2E test environment
 * Creates isolated database and starts a real HTTP server
 */
export async function setupE2EEnvironment(): Promise<void> {
  if (isInitialized) return

  TEST_DATA_DIR = join(tmpdir(), 'malamar-e2e-' + Date.now() + '-' + Math.random().toString(36).slice(2))

  // Clean up any existing test data
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true })
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true })

  // Initialize with test config
  initConfig({
    dataDir: TEST_DATA_DIR,
    port: 0, // Will be assigned by server
    logLevel: 'error', // Suppress logs during tests
  })

  initLogger({
    format: 'json',
    level: 'error',
  })

  await initDatabase(TEST_DATA_DIR)

  // Start real HTTP server on random port
  server = serve({
    port: 0, // Let OS assign an available port
    fetch: app.fetch,
  })

  serverUrl = `http://localhost:${server.port}`
  isInitialized = true
}

/**
 * Clean up E2E test environment
 */
export async function teardownE2EEnvironment(): Promise<void> {
  if (!isInitialized) return

  // Stop the server
  if (server) {
    server.stop(true)
    server = null
  }

  closeDatabase()

  // Clean up test data directory
  if (TEST_DATA_DIR && existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true })
  }

  serverUrl = ''
  isInitialized = false
}

/**
 * Make HTTP request to real test server
 */
export async function request(
  method: string,
  path: string,
  options?: {
    body?: unknown
    headers?: Record<string, string>
    formData?: FormData
  }
): Promise<Response> {
  const url = new URL(path, getServerUrl())

  const requestInit: RequestInit = {
    method,
    headers: {
      ...(options?.body && !options?.formData
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options?.headers,
    },
  }

  if (options?.formData) {
    requestInit.body = options.formData
  } else if (options?.body) {
    requestInit.body = JSON.stringify(options.body)
  }

  // Use real fetch to make actual HTTP request
  return fetch(url, requestInit)
}

/**
 * Helper to make GET request
 */
export async function get(path: string): Promise<Response> {
  return request('GET', path)
}

/**
 * Helper to make POST request
 */
export async function post(path: string, body?: unknown): Promise<Response> {
  return request('POST', path, { body })
}

/**
 * Helper to make PUT request
 */
export async function put(path: string, body?: unknown): Promise<Response> {
  return request('PUT', path, { body })
}

/**
 * Helper to make DELETE request
 */
export async function del(path: string): Promise<Response> {
  return request('DELETE', path)
}

/**
 * Helper to parse JSON response
 */
export async function json<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

/**
 * Assert response status
 */
export function assertStatus(response: Response, expected: number): void {
  if (response.status !== expected) {
    throw new Error(`Expected status ${expected}, got ${response.status}`)
  }
}

/**
 * Wait for a task to reach a specific status
 * @param taskId Task ID to poll
 * @param expectedStatus Status to wait for (or array of statuses)
 * @param timeoutMs Maximum time to wait (default: 2 minutes)
 * @param intervalMs Poll interval (default: 1 second)
 */
export async function waitForTaskStatus(
  taskId: string,
  expectedStatus: string | string[],
  timeoutMs: number = 120000,
  intervalMs: number = 1000
): Promise<{ id: string; status: string }> {
  const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const res = await get(`/api/tasks/${taskId}`)
    if (res.status !== 200) {
      throw new Error(`Failed to get task ${taskId}: ${res.status}`)
    }

    const task = await json<{ id: string; status: string }>(res)
    if (statuses.includes(task.status)) {
      return task
    }

    await sleep(intervalMs)
  }

  throw new Error(`Timeout waiting for task ${taskId} to reach status ${statuses.join(' or ')}`)
}

/**
 * Wait for routing to complete
 * @param taskId Task ID to check routing for
 * @param timeoutMs Maximum time to wait (default: 2 minutes)
 * @param intervalMs Poll interval (default: 1 second)
 */
export async function waitForRoutingComplete(
  taskId: string,
  timeoutMs: number = 120000,
  intervalMs: number = 1000
): Promise<{ id: string; status: string; taskId: string }> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const res = await get(`/api/routing/task/${taskId}`)
    if (res.status !== 200) {
      throw new Error(`Failed to get routing for task ${taskId}: ${res.status}`)
    }

    const routing = await json<{ id: string; status: string; taskId: string } | null>(res)
    if (routing && (routing.status === 'completed' || routing.status === 'failed')) {
      return routing
    }

    await sleep(intervalMs)
  }

  throw new Error(`Timeout waiting for routing to complete for task ${taskId}`)
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * E2E test data factory functions
 */
export const factory = {
  /**
   * Create a test workspace
   */
  async createWorkspace(
    name = 'E2E Test Workspace'
  ): Promise<{
    id: string
    name: string
    createdAt: number
    updatedAt: number
  }> {
    const res = await post('/api/workspaces', { name })
    assertStatus(res, 201)
    return json(res)
  },

  /**
   * Create a test agent optimized for e2e testing
   * Uses instructions that produce fast, predictable results
   */
  async createAgent(
    workspaceId: string,
    data?: {
      name?: string
      roleInstruction?: string
      workingInstruction?: string
      timeoutMinutes?: number
    }
  ): Promise<{
    id: string
    workspaceId: string
    name: string
    roleInstruction: string | null
    workingInstruction: string | null
    order: number
    timeoutMinutes: number | null
    createdAt: number
    updatedAt: number
  }> {
    const res = await post(`/api/workspaces/${workspaceId}/agents`, {
      name: data?.name ?? 'E2E Test Agent',
      roleInstruction: data?.roleInstruction,
      workingInstruction: data?.workingInstruction,
      timeoutMinutes: data?.timeoutMinutes ?? 2,
    })
    assertStatus(res, 201)
    return json(res)
  },

  /**
   * Create a skip agent that always returns skip result
   * This is the fastest and cheapest way to test the routing pipeline
   */
  async createSkipAgent(
    workspaceId: string,
    name = 'Skip Agent'
  ): Promise<{
    id: string
    workspaceId: string
    name: string
    roleInstruction: string | null
    workingInstruction: string | null
    order: number
    timeoutMinutes: number | null
    createdAt: number
    updatedAt: number
  }> {
    const workingInstruction = `
This is an automated test. Your job is to quickly skip this task.

Steps:
1. Read the task_input.json file in the current directory
2. Create a task_output.json file with the following content:
   { "result": "skip" }
3. Do not perform any other actions

This is a test task. Always skip it.
`.trim()

    return factory.createAgent(workspaceId, {
      name,
      roleInstruction: 'You are a test agent that skips all tasks.',
      workingInstruction,
      timeoutMinutes: 2,
    })
  },

  /**
   * Create a test task
   */
  async createTask(
    workspaceId: string,
    data?: {
      title?: string
      description?: string
    }
  ): Promise<{
    id: string
    workspaceId: string
    title: string
    description: string | null
    status: string
    createdAt: number
    updatedAt: number
  }> {
    const res = await post(`/api/workspaces/${workspaceId}/tasks`, {
      title: data?.title ?? 'E2E Test Task',
      description: data?.description ?? 'This is an automated e2e test task.',
    })
    assertStatus(res, 201)
    return json(res)
  },
}

/**
 * Type for error response
 */
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
