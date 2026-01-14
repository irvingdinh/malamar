/**
 * Test Setup and Utilities
 *
 * Provides test helpers for integration testing the Malamar API.
 * Import this in each test file to get access to setup/teardown and helpers.
 */

import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app } from '../src/app'
import { initConfig, initDatabase, closeDatabase, initLogger } from '../src/modules/core'

// Test data directory - isolated from production
let TEST_DATA_DIR: string

// Track if environment is initialized
let isInitialized = false

// Base URL for tests
export const BASE_URL = 'http://localhost'

/**
 * Initialize test environment
 * Creates isolated database and config for testing
 */
export async function setupTestEnvironment(): Promise<void> {
  if (isInitialized) return

  TEST_DATA_DIR = join(tmpdir(), 'malamar-test-' + Date.now() + '-' + Math.random().toString(36).slice(2))

  // Clean up any existing test data
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true })
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true })

  // Initialize with test config
  initConfig({
    dataDir: TEST_DATA_DIR,
    port: 0, // Use any available port
    logLevel: 'error', // Suppress logs during tests
  })

  initLogger({
    format: 'json',
    level: 'error',
  })

  await initDatabase(TEST_DATA_DIR)
  isInitialized = true
}

/**
 * Clean up test environment
 */
export async function teardownTestEnvironment(): Promise<void> {
  if (!isInitialized) return

  closeDatabase()

  // Clean up test data directory
  if (TEST_DATA_DIR && existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true })
  }

  isInitialized = false
}

/**
 * Make HTTP request to test server
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
  const url = new URL(path, BASE_URL)

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

  // Use the app's fetch handler directly
  return app.fetch(new Request(url, requestInit))
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
 * Test data factory functions
 */
export const factory = {
  /**
   * Create a test workspace
   */
  async createWorkspace(
    name = 'Test Workspace'
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
   * Create a test agent
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
      name: data?.name ?? 'Test Agent',
      roleInstruction: data?.roleInstruction,
      workingInstruction: data?.workingInstruction,
      timeoutMinutes: data?.timeoutMinutes,
    })
    assertStatus(res, 201)
    return json(res)
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
      title: data?.title ?? 'Test Task',
      description: data?.description,
    })
    assertStatus(res, 201)
    return json(res)
  },

  /**
   * Create a test template
   */
  async createTemplate(
    workspaceId: string,
    data?: {
      name?: string
      title?: string
      description?: string
    }
  ): Promise<{
    id: string
    workspaceId: string
    name: string
    title: string
    description: string | null
    order: number
    createdAt: number
    updatedAt: number
  }> {
    const res = await post(`/api/workspaces/${workspaceId}/templates`, {
      name: data?.name ?? 'Test Template',
      title: data?.title ?? 'Test Title',
      description: data?.description,
    })
    assertStatus(res, 201)
    return json(res)
  },

  /**
   * Create a test execution
   */
  async createExecution(data: {
    taskId: string
    agentId: string
    agentName: string
  }): Promise<{
    id: string
    taskId: string
    agentId: string
    agentName: string
    status: string
    result: string | null
    output: string | null
    startedAt: number | null
    completedAt: number | null
    createdAt: number
    updatedAt: number
  }> {
    const res = await post('/api/executions', data)
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
