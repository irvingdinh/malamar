/**
 * Core Module - Utilities
 *
 * ID generation, timestamps, and helper functions.
 */

import { tmpdir } from 'node:os'

// Simple nanoid-like ID generation (21 characters, URL-safe)
const ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

export function generateId(size: number = 21): string {
  let id = ''
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i]! & 63]
  }
  return id
}

/**
 * Get current timestamp in milliseconds (Unix epoch)
 */
export function now(): number {
  return Date.now()
}

/**
 * Get cross-platform temp directory path
 */
export function getTempDir(): string {
  return tmpdir()
}

/**
 * Safely parse JSON, returning undefined on error
 */
export function safeJsonParse<T>(json: string): T | undefined {
  try {
    return JSON.parse(json) as T
  } catch {
    return undefined
  }
}

/**
 * Safely stringify to JSON, returning undefined on error
 */
export function safeJsonStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 100, maxDelay = 1000 } = options

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        await sleep(delay)
      }
    }
  }
  throw lastError
}
