/**
 * Executor Module - Public API
 *
 * Exports for the task execution module.
 */

// Pool
export { initPool, getPool, ConcurrencyPool } from './pool'

// Service
export { executorService } from './service'

// Claude adapter
export {
  spawnClaude,
  getClaudePath,
  isClaudeAvailable,
  getClaudeVersion,
  createTaskInputContent,
  type ClaudeSpawnOptions,
  type ClaudeSpawnResult,
  type ClaudeExitResult,
} from './adapters/claude'

// Types
export type {
  AgentResult,
  TaskOutput,
  TaskInput,
  ExecutionContext,
  ProcessHandle,
  PoolStats,
} from './types'
