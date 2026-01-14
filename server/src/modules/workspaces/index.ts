/**
 * Workspaces Module
 */

export { workspaces } from './routes'
export { workspaceService } from './service'
export { workspaceRepository, settingsRepository } from './repository'
export type {
  Workspace,
  WorkspaceWithSettings,
  WorkspaceSetting,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  SettingKey,
} from './types'
