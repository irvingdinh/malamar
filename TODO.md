# Malamar Standalone - Implementation Tasks

> Single-binary, zero-configuration autonomous task orchestration system using Bun + Hono + SQLite.

See [STANDALONE.md](./STANDALONE.md) for full specification.

---

## Phase 1: Project Setup & Core Foundation

### Project Structure
- [x] Initialize `server/` directory with `package.json`, `tsconfig.json`, `bunfig.toml`
- [x] Create `Makefile` with `dev-server`, `build`, `clean` targets (basic version)
- [x] Set up directory structure: `server/src/modules/`, `server/src/index.ts`, `server/src/app.ts`
- [x] Add `.gitignore` entries for `malamar`, `dist/`, `server/public/ui/`

### Core Module: Config
- [x] Create `server/src/modules/core/config.ts` with config loading
  - Load from env vars, CLI args, and `$HOME/.malamar/config.json`
  - Priority: ENV > CLI flags > config.json > Defaults
  - Supported options: port, dataDir, tmpDir, logFormat, logLevel, claudePath
- [x] Create `server/src/modules/core/types.ts` with `Config` interface

### Core Module: Database
- [x] Create `server/src/modules/core/database.ts` with SQLite setup
  - Initialize `bun:sqlite` database at `$HOME/.malamar/malamar.db`
  - Ensure data directory exists
  - Enable WAL mode for better concurrency
- [x] Add database busy handling with exponential backoff (100ms, 200ms, 400ms, max 3 retries)

### Core Module: Migration Runner
- [x] Create `server/migrations/` directory structure
- [x] Implement migration runner in `database.ts`
  - Track applied migrations in `_migrations` table
  - Run migrations in order by filename (timestamp-based: `001_initial.sql`)
  - No rollback support (forward-only)
- [x] Create `server/migrations/001_initial.sql` with all tables and indexes
  - Tables: workspaces, workspace_settings, agents, tasks, task_routings, comments, attachments, executions, execution_logs, task_templates, _migrations
  - All indexes as specified in STANDALONE.md

### Core Module: Logger
- [x] Create `server/src/modules/core/logger.ts`
  - Pretty format: `[2025-01-14 12:00:00] INFO  Message here`
  - JSON format: `{"level":"info","time":"...","msg":"..."}`
  - Auto format: detect TTY and choose pretty/json
- [x] Support log levels: debug, info, warn, error
- [x] Export logger instance and log functions

### Core Module: Errors
- [x] Create `server/src/modules/core/errors.ts`
  - Define `AppError` base class with status code and error code
  - Create specific errors: `NotFoundError`, `ValidationError`, `ConflictError`, `DatabaseError`
- [x] Define standard error response format: `{ error: { code, message, details? } }`

### Core Module: Utilities
- [x] Create `server/src/modules/core/utils.ts`
  - ID generation with nanoid (plain IDs, no prefixes)
  - Timestamp utilities (current time in milliseconds)
  - Cross-platform temp path resolution via `os.tmpdir()`
  - JSON-safe parsing helper

### Core Module: Exports
- [x] Create `server/src/modules/core/index.ts` with module exports

---

## Phase 2: Hono App & Health

### Hono App Setup
- [x] Create `server/src/app.ts` with Hono app initialization
  - Import and compose all route modules
  - No CORS middleware (single-binary, same-origin)
  - No body size limit
- [x] Add request logging middleware (log method, path, status, duration)
- [x] Add global error handler middleware (convert errors to standard format)

### Health Endpoint
- [x] Create health route: `GET /api/health`
  - Return: version, uptime (seconds), database status
  - Include CLI status: configured path, whether executable exists
- [x] Read version from `package.json`

### Static File Serving
- [x] Set up static file serving from `server/public/ui/`
- [x] Implement SPA routing: serve `index.html` for unknown routes (non-API, non-file)
- [x] Handle missing UI gracefully (return message to build UI first)

### Entry Point
- [x] Create `server/src/index.ts` as main entry
  - Parse CLI arguments (basic: --port, --help, --version)
  - Initialize config, database, logger
  - Start Hono server
  - Log startup message with port

---

## Phase 3: Workspaces Module

### Workspace Repository
- [x] Create `server/src/modules/workspaces/repository.ts`
  - `findAll()`: List all workspaces ordered by updated_at desc
  - `findById(id)`: Get single workspace
  - `create(data)`: Insert new workspace
  - `update(id, data)`: Update workspace
  - `delete(id)`: Delete workspace (settings, agents, tasks cascade via FK)
- [x] Create `server/src/modules/workspaces/types.ts` with `Workspace` interface

### Workspace Settings Repository
- [x] Add settings repository in same file or separate
  - `findByWorkspaceId(workspaceId)`: Get all settings for workspace
  - `get(workspaceId, key)`: Get single setting
  - `set(workspaceId, key, value)`: Upsert setting (JSON.stringify value)
  - `delete(workspaceId, key)`: Remove setting
- [x] Define known settings keys: `instruction`

### Workspace Service
- [x] Create `server/src/modules/workspaces/service.ts`
  - `list()`: Return workspaces with settings eager-loaded
  - `get(id)`: Return workspace with settings and agents
  - `create(data)`: Create workspace with default settings
  - `update(id, data)`: Update workspace name
  - `delete(id)`: Delete workspace (handle in-progress tasks)
- [x] Add validation for required fields (name)

### Workspace Routes
- [x] Create `server/src/modules/workspaces/routes.ts`
  - `GET /api/workspaces`: List workspaces
  - `POST /api/workspaces`: Create workspace
  - `GET /api/workspaces/:id`: Get workspace detail
  - `PUT /api/workspaces/:id`: Update workspace
  - `DELETE /api/workspaces/:id`: Delete workspace
  - `GET /api/workspaces/:id/settings`: Get all settings
  - `PUT /api/workspaces/:id/settings/:key`: Set a setting
  - `DELETE /api/workspaces/:id/settings/:key`: Delete a setting

### Workspace Module Exports
- [x] Create `server/src/modules/workspaces/index.ts`

---

## Phase 4: Agents Module

### Agent Repository
- [x] Create `server/src/modules/agents/repository.ts`
  - `findByWorkspaceId(workspaceId)`: List agents ordered by `order` asc
  - `findById(id)`: Get single agent
  - `create(data)`: Insert agent (assign next order value)
  - `update(id, data)`: Update agent fields
  - `delete(id)`: Delete agent
  - `reorder(workspaceId, orderedIds)`: Update order for all agents
- [x] Create `server/src/modules/agents/types.ts` with `Agent` interface

### Agent Service
- [x] Create `server/src/modules/agents/service.ts`
  - `listByWorkspace(workspaceId)`: Get ordered agents
  - `get(id)`: Get agent (verify exists)
  - `create(workspaceId, data)`: Create agent
  - `update(id, data)`: Update agent
  - `delete(id)`: Delete agent (recompute order for remaining)
  - `reorder(workspaceId, orderedIds)`: Reorder agents
- [x] Validate agent belongs to workspace on operations

### Agent Routes
- [x] Create `server/src/modules/agents/routes.ts`
  - `GET /api/workspaces/:id/agents`: List agents
  - `POST /api/workspaces/:id/agents`: Create agent
  - `PUT /api/workspaces/:id/agents/:agentId`: Update agent
  - `DELETE /api/workspaces/:id/agents/:agentId`: Delete agent
  - `PUT /api/workspaces/:id/agents/reorder`: Reorder agents (body: `{ orderedIds: string[] }`)

### Agent Module Exports
- [x] Create `server/src/modules/agents/index.ts`

---

## Phase 5: Tasks Module

### Task Repository
- [x] Create `server/src/modules/tasks/repository.ts`
  - `findByWorkspaceId(workspaceId, filters?)`: List tasks with optional status filter
  - `findById(id)`: Get single task
  - `create(data)`: Insert task
  - `update(id, data)`: Update task fields
  - `delete(id)`: Delete task (comments, attachments cascade)
  - `updateStatus(id, status)`: Update status with timestamp handling
- [x] Create `server/src/modules/tasks/types.ts` with `Task`, `TaskStatus` types

### Comment Repository
- [x] Create `server/src/modules/tasks/comment-repository.ts`
  - `findByTaskId(taskId)`: List comments ordered by created_at asc
  - `create(data)`: Insert comment
  - `delete(id)`: Delete comment
- [x] Define `Comment` interface with author, authorType (human, agent, system), content, log

### Attachment Repository
- [x] Create `server/src/modules/tasks/attachment-repository.ts`
  - `findByTaskId(taskId)`: List attachments
  - `findById(id)`: Get single attachment
  - `create(data)`: Insert attachment record
  - `delete(id)`: Delete attachment record
- [x] Define `Attachment` interface with filename, storedName, mimeType, size
- [x] Storage location: `$HOME/.malamar/attachments/`

### Attachment File Operations
- [x] Implement file save: generate stored name (nanoid + extension), write to attachments dir
- [x] Implement file delete: remove file from disk when attachment deleted
- [x] Implement file read: return file path for download
- [x] Copy attachment to workspace directory on task execution

### Task Service
- [x] Create `server/src/modules/tasks/service.ts`
  - `listByWorkspace(workspaceId, filters)`: Get tasks with pagination
  - `get(id)`: Get task with comments and attachments
  - `create(workspaceId, data)`: Create task, trigger routing if status is todo
  - `update(id, data)`: Update task
  - `delete(id)`: Delete task (cleanup attachments)
  - `updateStatus(id, status)`: Status transition with validation
- [x] Handle comment creation triggers: re-route if status is not `done`

### Comment Trigger Logic
- [x] When human comment added and status is `in_review` or `todo`: trigger routing
- [x] When human comment added and status is `done`: no action (comment only)
- [x] System comments (from cancellation, errors) never trigger routing

### Task Routes
- [x] Create `server/src/modules/tasks/routes.ts`
  - `GET /api/workspaces/:id/tasks`: List tasks (query: status, page, limit)
  - `POST /api/workspaces/:id/tasks`: Create task
  - `GET /api/tasks/:id`: Get task detail
  - `PUT /api/tasks/:id`: Update task
  - `DELETE /api/tasks/:id`: Delete task
  - `POST /api/tasks/:id/cancel`: Cancel in-progress task
  - `POST /api/tasks/:id/restart`: Restart task execution

### Comment Routes
- [x] Add to task routes file
  - `GET /api/tasks/:id/comments`: List comments
  - `POST /api/tasks/:id/comments`: Add comment (triggers routing if applicable)

### Attachment Routes
- [x] Add to task routes file or separate
  - `GET /api/tasks/:id/attachments`: List attachments
  - `POST /api/tasks/:id/attachments`: Upload attachment (multipart form)
  - `DELETE /api/attachments/:id`: Delete attachment
  - `GET /api/attachments/:id/download`: Download attachment file

### Tasks Module Exports
- [x] Create `server/src/modules/tasks/index.ts`

---

## Phase 6: Templates Module

### Template Repository
- [x] Create `server/src/modules/templates/repository.ts`
  - `findByWorkspaceId(workspaceId)`: List templates ordered by `order`
  - `findById(id)`: Get single template
  - `create(data)`: Insert template
  - `update(id, data)`: Update template
  - `delete(id)`: Delete template

### Template Service
- [x] Create `server/src/modules/templates/service.ts`
  - `listByWorkspace(workspaceId)`: Get templates
  - `get(id)`: Get template
  - `create(workspaceId, data)`: Create template
  - `update(id, data)`: Update template
  - `delete(id)`: Delete template
- [x] Create `server/src/modules/templates/types.ts` with `TaskTemplate` interface

### Template Routes
- [x] Create `server/src/modules/templates/routes.ts`
  - `GET /api/workspaces/:id/templates`: List templates
  - `POST /api/workspaces/:id/templates`: Create template
  - `PUT /api/workspaces/:id/templates/:templateId`: Update template
  - `DELETE /api/workspaces/:id/templates/:templateId`: Delete template

### Templates Module Exports
- [x] Create `server/src/modules/templates/index.ts`

---

## Phase 7: Executions Module

### Execution Repository
- [x] Create `server/src/modules/executions/repository.ts`
  - `findAll(filters?)`: List executions with pagination, filter by task/status
  - `findById(id)`: Get single execution
  - `findByTaskId(taskId)`: List executions for a task
  - `create(data)`: Insert execution
  - `update(id, data)`: Update execution (status, result, output, timestamps)

### Execution Logs Repository
- [x] Create log repository in same file or separate
  - `findByExecutionId(executionId)`: Get all logs for execution
  - `append(executionId, content)`: Add log entry with timestamp
  - `deleteByExecutionId(executionId)`: Clear logs for execution

### Execution Service
- [x] Create `server/src/modules/executions/service.ts`
  - `list(filters)`: List executions with pagination
  - `get(id)`: Get execution with logs
  - `getByTask(taskId)`: Get executions for task
  - `create(taskId, agentId, agentName)`: Create pending execution
  - `start(id)`: Mark as running with startedAt
  - `complete(id, result, output)`: Mark completed with completedAt
  - `fail(id, error)`: Mark failed
  - `appendLog(id, content)`: Add log line
  - `analytics()`: Compute agent analytics (success rate, avg duration)

### Execution Routes
- [x] Create `server/src/modules/executions/routes.ts`
  - `GET /api/executions`: List executions (query: taskId, status, page, limit)
  - `GET /api/executions/:id`: Get execution detail
  - `GET /api/executions/:id/logs`: Get execution logs
  - `GET /api/executions/analytics`: Get agent analytics

### Executions Module Exports
- [x] Create `server/src/modules/executions/index.ts`

---

## Phase 8: Events Module (SSE)

### Event Emitter
- [x] Create `server/src/modules/events/emitter.ts`
  - In-memory event emitter (EventEmitter or custom)
  - `emit(type, payload)`: Broadcast event to all listeners
  - `subscribe(callback)`: Add listener, return unsubscribe function
- [x] Define event types in `server/src/modules/events/types.ts`
  - task:created, task:updated, task:deleted
  - task:comment:added
  - execution:created, execution:updated
  - routing:updated

### General Events SSE Endpoint
- [x] Create `server/src/modules/events/routes.ts`
  - `GET /api/events`: SSE endpoint for general events
  - Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
  - Send keepalive every 30 seconds
  - Stream format: `data: {"type":"...","payload":{...}}\n\n`

### Execution Log Streaming Endpoint
- [x] Add execution-specific SSE route
  - `GET /api/events/executions/:id/logs`: Stream logs for specific execution
  - Stream existing logs first, then new logs as they arrive
  - Close stream when execution completes

### Events Module Exports
- [x] Create `server/src/modules/events/index.ts`

---

## Phase 9: Executor Module

### Concurrency Pool
- [x] Create `server/src/modules/executor/pool.ts`
  - Semaphore implementation for limiting concurrent executions
  - `acquire()`: Wait for slot, return release function
  - `tryAcquire()`: Non-blocking acquire, return null if full
  - `getStats()`: Return current/max concurrent counts
- [x] Read maxConcurrent from config (default: 0 = unlimited)

### Claude CLI Adapter
- [x] Create `server/src/modules/executor/adapters/claude.ts`
  - `spawn(workspacePath, inputPath)`: Spawn Claude CLI process
  - Command: `claude --output-format stream-json --verbose -p --dangerously-skip-permissions`
  - Stdin: `Read {inputPath} and follow the instructions in fully autonomous mode.`
  - Parse stream-json output line by line
  - Return process handle for control
- [x] Implement output parsing: extract content from stream-json format
- [x] Handle process termination (normal exit, timeout, kill)

### Executor Service
- [x] Create `server/src/modules/executor/service.ts`
  - `execute(execution, task, agent, workspace)`: Run single agent execution
    1. Acquire concurrency slot
    2. Prepare workspace directory
    3. Write task_input.json
    4. Spawn CLI process
    5. Stream output to logs
    6. Read task_output.json
    7. Update execution record
    8. Release slot
- [x] Implement timeout handling: kill process if agent.timeoutMinutes exceeded
- [x] Track running processes for cancellation

### Process Management
- [x] Maintain map of executionId -> process handle
- [x] `cancel(executionId)`: Kill process, update execution status
- [x] `cancelByTask(taskId)`: Kill all processes for task
- [x] Cleanup on process exit (release slot, update status)

### Executor Module Exports
- [x] Create `server/src/modules/executor/index.ts`

---

## Phase 10: Routing Module

### Task Routing Repository
- [x] Create `server/src/modules/routing/repository.ts`
  - `findByTaskId(taskId)`: Get routing state for task
  - `create(taskId)`: Create initial routing state
  - `update(taskId, data)`: Update routing state
  - `delete(taskId)`: Delete routing state
  - `findPending()`: Find tasks with pending/executing routing
- [x] Define `TaskRouting` interface with status, currentAgentIndex, iteration, anyAgentWorked, lockedAt, retryCount

### Routing Service
- [x] Create `server/src/modules/routing/service.ts`
  - `trigger(taskId)`: Start or resume task routing
    1. Create/update routing state
    2. Set task status to in_progress
    3. Lock routing
    4. Start execution loop
- [x] Implement sequential execution loop
  - Execute agents in order (0 to N-1)
  - Track anyAgentWorked flag per iteration
  - On completion of all agents: check anyAgentWorked
  - If worked: reset index, increment iteration, continue
  - If not worked: complete routing, set task to in_review

### Handle Agent Results
- [x] `skip`: Continue to next agent, no flag change
- [x] `comment`: Set anyAgentWorked=true, create comment record with log
- [x] `error`: Handle with retry logic

### Agent Timeout Handling
- [x] When agent times out: kill process, counts as "worked" (anyAgentWorked=true)
- [x] Add system comment noting timeout
- [x] Continue to next agent

### Retry Logic
- [x] On CLI crash (non-timeout): retry immediately up to 3 times
- [x] After 3 retries: mark execution as failed, add error comment
- [x] Continue to next agent (do not block on single agent failure)

### Integration with Executor
- [x] Call executor.execute() for each agent
- [x] Handle execution results and errors
- [x] Emit routing:updated events for UI updates

### Routing Module Exports
- [x] Create `server/src/modules/routing/index.ts`

---

## Phase 11: Settings Module

### Global Settings Service
- [x] Create `server/src/modules/settings/service.ts`
  - `get()`: Read settings from config.json
  - `update(settings)`: Write settings to config.json
  - Settings: clis (array with type, path, maxConcurrent), server (port)
- [x] Merge with runtime config (env/CLI overrides not persisted)

### CLI Health Check
- [x] Implement `checkCliHealth()`: Actually execute `claude --version`
- [x] Return: installed (boolean), version (string if available), path
- [x] Cache result for short duration (5 seconds)

### Settings Routes
- [x] Create `server/src/modules/settings/routes.ts`
  - `GET /api/settings`: Get global settings with runtime status
  - `PUT /api/settings`: Update global settings
  - `GET /api/settings/cli/health`: On-demand CLI health check

### Settings Module Exports
- [x] Create `server/src/modules/settings/index.ts`

---

## Phase 12: CLI Interface

### CLI Argument Parsing
- [ ] Enhance `server/src/index.ts` with full CLI parsing
  - `--port, -p <number>`: Server port (default: 3456)
  - `--data-dir <path>`: Data directory (default: $HOME/.malamar)
  - `--tmp-dir <path>`: Temp directory (default: os.tmpdir()/malamar)
  - `--log-format <format>`: pretty, json, auto (default: auto)
  - `--log-level <level>`: debug, info, warn, error (default: info)
- [ ] Support positional commands: `malamar [command] [options]`

### Help Command
- [ ] Implement `malamar help` command
  - Show usage, available commands, options
  - Show examples

### Version Command
- [ ] Implement `malamar version` command
  - Read version from package.json
  - Output: `malamar v0.0.1`

### Export Command
- [ ] Implement `malamar export` command
  - `malamar export`: All workspaces to stdout
  - `malamar export --output backup.json`: All to file
  - `malamar export --workspace <id>`: Single workspace
- [ ] Export format as specified in STANDALONE.md
- [ ] Exclude: attachments, executions, execution_logs, task_routings

### Import Command
- [ ] Implement `malamar import <file>` command
  - Read JSON file
  - Validate format version
  - On ID collision: fail with error (do not overwrite)
  - Allow duplicate names
  - Create all entities in transaction

---

## Phase 13: Recovery & Lifecycle

### Startup Recovery
- [ ] On server startup: query tasks with `status = 'in_progress'`
- [ ] For each in-progress task:
  - Check task_routings table for state
  - Resume from current_agent_index in current iteration
  - Re-trigger routing service

### Manual Recovery API
- [ ] Add endpoint: `POST /api/recovery/trigger`
  - Manually trigger recovery process
  - Return count of recovered tasks

### Graceful Shutdown
- [ ] Handle SIGTERM and SIGINT signals
- [ ] On shutdown:
  1. Stop accepting new routing triggers
  2. Wait up to 30 seconds for in-flight executions
  3. Force kill remaining processes
  4. Close database connection
  5. Exit with code 0

### Workspace Deletion Handling
- [ ] When workspace deleted with in-progress tasks:
  - Cancel all running executions for that workspace
  - Wait for processes to terminate
  - Then delete (cascade will clean up records)
- [ ] Add query param: `DELETE /api/workspaces/:id?force=true`

### Task Cancellation
- [ ] `POST /api/tasks/:id/cancel`:
  - Kill running CLI process for task
  - Set task status back to `todo`
  - Add system comment: "Task cancelled by user"
  - Update routing state to failed
- [ ] Handle case where task is not in_progress

---

## Phase 14: Build & Release

### Makefile Enhancement
- [ ] Complete Makefile with all targets:
  - `dev-ui`: Start UI dev server (for future UI)
  - `dev-server`: Start server with watch mode
  - `build-ui`: Build UI to server/public/ui
  - `build-server`: Compile single binary
  - `build`: Build UI and server
  - `build-all`: Cross-platform builds (darwin-arm64, darwin-x64, linux-x64, linux-arm64, windows-x64)
  - `test`: Run server tests
  - `clean`: Remove build artifacts
  - `version`: Show current version

### Cross-Platform Binary Compilation
- [ ] Add Bun compile targets:
  - `bun-darwin-arm64` (Apple Silicon)
  - `bun-darwin-x64` (Intel Mac)
  - `bun-linux-x64`
  - `bun-linux-arm64`
  - `bun-windows-x64`
- [ ] Output to `dist/` directory with platform suffix

### Dockerfile
- [ ] Create `Dockerfile` for containerized deployment
  - Multi-stage build: build + runtime
  - Use Bun base image
  - Copy compiled binary
  - Expose port 3456
  - Set default data directory
  - Health check endpoint

### UI Build Integration
- [ ] Configure Vite to output to `ui/dist/`
- [ ] Makefile `build-ui` copies to `server/public/ui/`
- [ ] Server serves static files from embedded directory

---

## Notes

- All IDs use plain nanoid (no prefixes like `ws_`, `task_`, etc.)
- Timestamps stored as INTEGER (Unix milliseconds)
- Cross-platform paths via `os.tmpdir()` and `os.homedir()`
- Attachments persist in `$HOME/.malamar/attachments/` (not temp)
- No max iterations on convergence loop - runs until all agents skip
- Comments always trigger routing except when task is `done`

---

*Last updated: 2026-01-14*
