/**
 * Recovery Module
 *
 * Handles recovery of in-progress tasks on server startup
 * and provides manual recovery API endpoints.
 */

export { recoveryService } from './service'
export type { RecoveryResult, RecoveryDetail } from './service'
export { recovery } from './routes'
