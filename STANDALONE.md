# Malamar Standalone - Technical Specification

> A single-binary, zero-configuration autonomous task orchestration system.

## Executive Summary

Please reference to the old code at: /Users/irvingdinh/Workspace/github.com/irvingdinh/malamar-obsoleted

Malamar Standalone is a simplified, self-contained version of Malamar designed to run as a single executable binary—similar to Pocketbase. It consolidates the API server, task executor, and web UI into one portable binary with SQLite for persistence.

### Design Philosophy

- **Single binary**: One file, run anywhere
- **Zero configuration**: Works out of the box with sensible defaults
- **Zero authentication**: Single-user, local-first experience
- **Minimal dependencies**: Only Hono (14KB) as runtime dependency
- **Embedded UI**: Web interface served from memory

---

## Goals & Non-Goals

### Goals

- Single executable binary for macOS, Linux, and Windows
- Embedded web UI (build-time asset embedding)
- SQLite database with automatic migrations
- Built-in task executor (no external task runner process)
- Sequential agent execution with convergence loop
- Server-Sent Events (SSE) for real-time updates
- CLI configuration management (Claude Code path, concurrency)
- Import/export functionality for backup and migration
- Resume in-progress tasks on server restart

### Non-Goals (v1)

- Multi-user authentication
- Multiple external task runners
- AI-powered routing agent (sequential only)
- Rate limiting
- Redis/PostgreSQL support
- Multiple simultaneous CLI backends (Claude only for v1)
- Homebrew/npm distribution (GitHub releases only)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Malamar Binary                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Hono HTTP Server                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │  │ REST API │  │   SSE    │  │ Static   │             │ │
│  │  │ /api/*   │  │ /events  │  │ UI (/)   │             │ │
│  │  └──────────┘  └──────────┘  └──────────┘             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Modules                              │ │
│  │  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐ ┌────────┐ │ │
│  │  │ core │ │tasks │ │executor│ │executions│ │settings│ │ │
│  │  └──────┘ └──────┘ └────────┘ └──────────┘ └────────┘ │ │
│  │  ┌──────────┐ ┌──────┐ ┌──────┐                       │ │
│  │  │workspaces│ │events│ │routing│                      │ │
│  │  └──────────┘ └──────┘ └──────┘                       │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              SQLite (bun:sqlite)                        │ │
│  │              $HOME/.malamar/malamar.db                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌─────────────┐               ┌──────────────┐
   │ Claude Code │               │ File System  │
   │    CLI      │               │ os.tmpdir()  │
   └─────────────┘               └──────────────┘
```

### Data Flow

```
1. User creates task via UI
       ↓
2. POST /api/workspaces/:id/tasks
       ↓
3. Task saved (status: todo)
       ↓
4. Routing triggered → status: in_progress
       ↓
5. Sequential execution: Agent 1 → Agent 2 → ... → Agent N
       ↓
6. Each agent: spawn Claude Code CLI process
       ↓
7. Execution logs streamed via SSE
       ↓
8. Check results:
   - If ANY agent worked (comment) → Loop back to Agent 1
   - If ALL agents skipped → status: in_review
       ↓
9. Human approves → status: done
   OR Human comments → re-run agents (in_progress)
```

---

## Project Structure

```
/
├── server/                          # Backend (Bun + Hono)
│   ├── public/                      # Gitignored, UI build output (directly here, not ui/ subdirectory)
│   ├── src/
│   │   ├── index.ts                 # Entry: CLI parsing, startup
│   │   ├── app.ts                   # Hono app composition
│   │   │
│   │   └── modules/
│   │       ├── core/                # Foundation module
│   │       │   ├── index.ts         # Module exports
│   │       │   ├── config.ts        # Config loading & validation
│   │       │   ├── database.ts      # SQLite setup, migrations
│   │       │   ├── logger.ts        # Logging (pretty/JSON)
│   │       │   ├── errors.ts        # Custom error types
│   │       │   ├── utils.ts         # Shared utilities
│   │       │   └── types.ts         # Shared TypeScript types
│   │       │
│   │       ├── workspaces/          # Workspace management
│   │       │   ├── index.ts
│   │       │   ├── routes.ts
│   │       │   ├── service.ts
│   │       │   ├── repository.ts
│   │       │   └── types.ts
│   │       │
│   │       ├── tasks/               # Task & comment management
│   │       │   ├── index.ts
│   │       │   ├── routes.ts
│   │       │   ├── service.ts
│   │       │   ├── repository.ts
│   │       │   └── types.ts
│   │       │
│   │       ├── routing/             # Sequential task routing
│   │       │   ├── index.ts
│   │       │   ├── service.ts       # Orchestration logic
│   │       │   ├── repository.ts
│   │       │   └── types.ts
│   │       │
│   │       ├── executor/            # CLI execution engine
│   │       │   ├── index.ts
│   │       │   ├── routes.ts        # Health/status endpoints
│   │       │   ├── service.ts       # Process spawning, pool mgmt
│   │       │   ├── pool.ts          # Concurrency semaphore
│   │       │   ├── adapters/
│   │       │   │   └── claude.ts    # Claude Code adapter
│   │       │   └── types.ts
│   │       │
│   │       ├── executions/          # Execution records & logs
│   │       │   ├── index.ts
│   │       │   ├── routes.ts
│   │       │   ├── service.ts
│   │       │   ├── repository.ts
│   │       │   └── types.ts
│   │       │
│   │       ├── events/              # SSE endpoints
│   │       │   ├── index.ts
│   │       │   ├── routes.ts
│   │       │   ├── emitter.ts       # Event broadcasting
│   │       │   └── types.ts
│   │       │
│   │       └── settings/            # Global settings API
│   │           ├── index.ts
│   │           ├── routes.ts
│   │           ├── service.ts
│   │           └── types.ts
│   │
│   ├── migrations/                  # SQL migration files
│   │   ├── 20250114120000_initial.sql
│   │   └── ...
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── bunfig.toml
│   ├── .eslintrc.js
│   └── .prettierrc
│
├── ui/                              # Frontend (React + Vite)
│   ├── src/
│   │   └── ...                      # User-managed
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .eslintrc.js
│   └── .prettierrc
│
├── .gitignore
├── CLAUDE.md
├── README.md
├── STANDALONE.md                    # This file
├── Makefile                         # Build orchestration
├── Dockerfile
├── malamar                          # Compiled binary (gitignored, malamar.exe on Windows)
└── malamar.exe                      # Windows binary (gitignored)
```

---

## Configuration

### File Locations

```
$HOME/.malamar/
├── malamar.db              # SQLite database (persistent)
├── config.json             # Runtime configuration
└── attachments/            # Uploaded files (persistent)

{os.tmpdir()}/malamar/      # Cross-platform temp directory
└── workspaces/{taskId}/    # Task execution directories
```

### config.json Schema

```json
{
  "clis": [
    {
      "type": "claude",
      "path": "auto",
      "maxConcurrent": null
    }
  ],
  "server": {
    "port": 3456
  }
}
```

**Notes:**
- `path: "auto"` means auto-detect from PATH
- `maxConcurrent: null` means unlimited (default)
- Version and health status are runtime-only (not persisted)
- Array structure supports future multi-CLI backends
- Config changes persist to file immediately

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MALAMAR_PORT` | `3456` | Server port |
| `MALAMAR_DATA_DIR` | `$HOME/.malamar` | Database, config, and attachments location |
| `MALAMAR_TMP_DIR` | `{os.tmpdir()}/malamar` | Temporary files location (cross-platform) |
| `MALAMAR_LOG_FORMAT` | `pretty` | Logging format: `pretty`, `json`, `auto` |
| `MALAMAR_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `MALAMAR_CLAUDE_CODE_PATH` | auto-detect | Path to Claude Code CLI |

### Configuration Priority

**ENV > CLI flags > config.json > Defaults**

---

## CLI Interface

### Commands

```bash
# Start server (default action)
malamar
malamar --port 8080
malamar --data-dir /custom/path
malamar --tmp-dir /custom/tmp
malamar --log-format json
malamar --log-level debug

# Utility commands
malamar help                              # Show help
malamar version                           # Show version (from package.json)

# Export/Import
malamar export                            # All workspaces → stdout
malamar export --output backup.json       # All workspaces → file
malamar export --workspace <id>           # Single workspace → stdout
malamar import backup.json                # Import from file (preserves original IDs, fails on collision)
```

### Export Format

```json
{
  "version": "1.0",
  "exportedAt": "2025-01-14T12:00:00.000Z",
  "workspaces": [
    {
      "id": "abc123xyz",
      "name": "My Project",
      "settings": [
        { "key": "instruction", "value": "Project instructions..." }
      ],
      "agents": [
        {
          "id": "def456uvw",
          "name": "Planner",
          "roleInstruction": "...",
          "workingInstruction": "...",
          "order": 0,
          "timeoutMinutes": null
        }
      ],
      "templates": [...],
      "tasks": [
        {
          "id": "ghi789rst",
          "title": "Implement feature X",
          "description": "...",
          "status": "done",
          "comments": [
            {
              "author": "Planner",
              "authorType": "agent",
              "content": "Completed implementation",
              "log": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

**Notes:**
- Import preserves original IDs
- Import fails on ID collision (does not overwrite)
- Duplicate names are allowed

**Excluded from export:**
- Attachments (files)
- Executions (runtime data)
- Execution logs
- Task routing state

---

## Database Schema

### SQLite with Raw SQL

Using `bun:sqlite` directly with custom migration runner.

### Migration Naming

Migrations use timestamp-based naming: `YYYYMMDDHHMMSS_description.sql`

Example: `20250114120000_initial.sql`

No rollback/down migrations are supported.

### Tables

```sql
-- Workspaces
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Workspace Settings (key-value with JSON values)
CREATE TABLE workspace_settings (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,  -- JSON encoded
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(workspace_id, key)
);

-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_instruction TEXT,
  working_instruction TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  timeout_minutes INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',  -- todo, in_progress, in_review, done
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Task Routing (execution state tracking)
CREATE TABLE task_routings (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, executing, completed, failed
  current_agent_index INTEGER NOT NULL DEFAULT 0,
  iteration INTEGER NOT NULL DEFAULT 0,
  any_agent_worked INTEGER NOT NULL DEFAULT 0,  -- boolean: did any agent work this iteration?
  locked_at INTEGER,  -- NULL = unlocked, timestamp = locked
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Comments
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_type TEXT NOT NULL,  -- user, agent, system
  content TEXT NOT NULL,
  log TEXT,  -- execution log for agent comments
  created_at INTEGER NOT NULL
);

-- Attachments
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  stored_name TEXT NOT NULL,  -- hashed filename on disk
  mime_type TEXT,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Executions
CREATE TABLE executions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  cli_type TEXT NOT NULL DEFAULT 'claude',  -- for future multi-CLI support
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
  result TEXT,  -- skip, comment, error
  output TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Execution Logs
CREATE TABLE execution_logs (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

-- Task Templates
CREATE TABLE task_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Migrations tracking
CREATE TABLE _migrations (
  version TEXT PRIMARY KEY
);
```

**Notes:**
- All IDs use plain nanoid (no prefixes like `ws_`, `task_`, etc.)
- `author_type` values: `user`, `agent`, `system`
- Templates are static - no relationship maintained after task creation

### Indexes

```sql
CREATE INDEX idx_workspace_settings_workspace ON workspace_settings(workspace_id);
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX idx_task_routings_status ON task_routings(status);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_executions_task ON executions(task_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_execution_logs_execution ON execution_logs(execution_id);
CREATE INDEX idx_task_templates_workspace ON task_templates(workspace_id);
```

### Settings Pattern

All settings-related storage uses JSON values for type preservation:

```typescript
// Storing
await db.run(
  'INSERT INTO workspace_settings (id, workspace_id, key, value, ...) VALUES (?, ?, ?, ?, ...)',
  [id, workspaceId, 'instruction', JSON.stringify('Your instructions here')]
)

// Reading (eager load with workspace)
const settings = db.query(`
  SELECT key, value FROM workspace_settings WHERE workspace_id = ?
`).all(workspaceId)

const parsed = Object.fromEntries(
  settings.map(s => [s.key, JSON.parse(s.value)])
)
```

---

## API Design

### Base URL

```
http://localhost:3456/api
```

No API versioning - just `/api/...` (not `/api/v1/...`).

### Error Response Format

All errors return a consistent format with appropriate HTTP status codes (400, 404, 409, 422, 500):

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "details": {
    "title": "Title is required",
    "status": "Invalid status value"
  }
}
```

### Endpoints

#### Workspaces

```
GET    /api/workspaces                    # List all workspaces
POST   /api/workspaces                    # Create workspace
GET    /api/workspaces/:id                # Get workspace (with settings, agents)
PUT    /api/workspaces/:id                # Update workspace
DELETE /api/workspaces/:id                # Delete workspace (cascade delete, force cancel running tasks)
```

#### Workspace Settings

```
GET    /api/workspaces/:id/settings       # Get all settings
PUT    /api/workspaces/:id/settings/:key  # Set a setting
DELETE /api/workspaces/:id/settings/:key  # Delete a setting
```

#### Agents

```
GET    /api/workspaces/:id/agents         # List agents (ordered)
POST   /api/workspaces/:id/agents         # Create agent
PUT    /api/workspaces/:id/agents/:agentId    # Update agent
DELETE /api/workspaces/:id/agents/:agentId    # Delete agent
PUT    /api/workspaces/:id/agents/reorder     # Reorder agents (new order applies from next iteration only)
```

#### Tasks

```
GET    /api/workspaces/:id/tasks          # List tasks (paginated, filterable)
POST   /api/workspaces/:id/tasks          # Create task
GET    /api/tasks/:id                     # Get task detail
PUT    /api/tasks/:id                     # Update task
DELETE /api/tasks/:id                     # Delete task
POST   /api/tasks/:id/cancel              # Cancel in-progress task
POST   /api/tasks/:id/restart             # Restart task execution
POST   /api/tasks/recover                 # Manual recovery trigger (same behavior as startup recovery)
```

#### Comments

```
GET    /api/tasks/:id/comments            # List comments
POST   /api/tasks/:id/comments            # Add comment
```

**Comment Behavior by Task Status:**
- `in_review`: Auto-retriggers routing, moves task to `in_progress`
- `todo`/`in_progress`: Queues another pass after current execution
- `done`: Requires manual status change to retrigger

#### Attachments

```
GET    /api/tasks/:id/attachments         # List attachments
POST   /api/tasks/:id/attachments         # Upload attachment
DELETE /api/attachments/:id               # Delete attachment (cascade delete with silent error handling)
GET    /api/attachments/:id/download      # Download attachment
```

**Attachment Storage:**
- Stored in `$HOME/.malamar/attachments/` (persistent)
- Copied to workspace directory before execution
- Cascade delete with silent error handling if file already missing

#### Executions

```
GET    /api/executions                    # List executions (paginated)
GET    /api/executions/:id                # Get execution detail
GET    /api/executions/:id/logs           # Get execution logs
```

#### Task Templates

```
GET    /api/workspaces/:id/templates      # List templates
POST   /api/workspaces/:id/templates      # Create template
PUT    /api/workspaces/:id/templates/:templateId   # Update template
DELETE /api/workspaces/:id/templates/:templateId   # Delete template
```

**Template Notes:**
- Templates are static only
- No relationship maintained after task creation

#### Settings (Global)

```
GET    /api/settings                      # Get global settings
PUT    /api/settings                      # Update global settings
GET    /api/settings/cli/health           # CLI health check (on-demand only)
```

**CLI Health Check:**
- Runs actual `claude -p 'Hi!'` command
- On-demand only (not periodic)
- Result cached in memory

#### Health

```
GET    /api/health                        # Server health check
```

**Response:**
```json
{
  "version": "0.0.1",
  "uptime": 3600,
  "cli": {
    "status": "healthy",
    "path": "/usr/local/bin/claude"
  }
}
```

### SSE Endpoints

```
GET    /api/events                        # General events stream
GET    /api/events/executions/:id/logs    # Execution log stream
```

**SSE Behavior:**
- Broadcast all events globally (no filtering)
- Keep connections open
- No heartbeat

#### Event Types (General Stream)

```typescript
// Task events
{ type: 'task:created', payload: { task } }
{ type: 'task:updated', payload: { task } }
{ type: 'task:deleted', payload: { taskId } }

// Comment events
{ type: 'task:comment:added', payload: { taskId, comment } }

// Execution events
{ type: 'execution:created', payload: { execution } }
{ type: 'execution:updated', payload: { execution } }

// Routing events
{ type: 'routing:updated', payload: { taskId, routing } }
```

#### Log Stream Format

```typescript
// Each SSE message
data: {"content": "Line of log output", "timestamp": 1234567890}
```

---

## Middleware

### Request Logging

Format: `GET /api/workspaces 200 12ms`

### No CORS

No CORS middleware (single-user local tool).

### No Body Size Limit

No body size limit configured.

---

## Server Startup

### Startup Sequence

1. Auto-create `$HOME/.malamar/` directory
2. Auto-create database file
3. Run migrations (crash on failure)
4. Check if port is available (crash with clear error if in use)
5. Check Claude CLI availability (log warning if not found, but start server anyway)
6. Start recovery for in-progress tasks
7. Print welcome banner

### Welcome Banner

```
┌─────────────────────────────────────────┐
│            Malamar v0.0.1               │
├─────────────────────────────────────────┤
│  Server:     http://localhost:3456      │
│  Data:       /Users/x/.malamar          │
│  CLI:        /usr/local/bin/claude      │
└─────────────────────────────────────────┘
```

### Error Handling

- Port in use: Crash with clear error message
- Database migration failure: Crash with error details
- CLI not found: Log warning, start server anyway

---

## Task Execution Flow

### Sequential Execution with Convergence Loop

The key behavior: **Agents keep working until they have nothing more to do.**

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Created (todo)                       │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│               Routing Triggered (in_progress)                │
│       TaskRouting: status=executing, index=0, iteration=1    │
│                     any_agent_worked=false                   │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               │
┌─────────────────────────────────┐               │
│     Execute Agent[index]        │               │
│   1. Create execution record    │               │
│   2. Write task_input.json      │               │
│   3. Spawn Claude CLI           │               │
│   4. Stream logs via SSE        │               │
│   5. Read task_output.json      │               │
│   6. Update execution record    │               │
└─────────────┬───────────────────┘               │
              │                                   │
              ▼                                   │
┌─────────────────────────────────┐               │
│     Process Result              │               │
│   - skip: continue              │               │
│   - comment: any_agent_worked=1 │               │
│   - error: retry or continue    │               │
└─────────────┬───────────────────┘               │
              │                                   │
              ▼                                   │
┌─────────────────────────────────┐               │
│   index++ < agents.length?      │───── yes ────┘
└─────────────┬───────────────────┘
              │ no (all agents executed this iteration)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Check: any_agent_worked?                    │
└─────────────┬───────────────────────────┬───────────────────┘
              │ yes                       │ no
              ▼                           ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│   Reset for next iteration  │ │  All Agents Complete        │
│   index=0                   │ │  (in_review)                │
│   iteration++               │ │  TaskRouting: completed     │
│   any_agent_worked=false    │ └──────────────┬──────────────┘
│   Loop back to Agent 1      │                │
└─────────────────────────────┘    ┌───────────┴───────────┐
                                   ▼                       ▼
                    ┌─────────────────────┐ ┌─────────────────────────┐
                    │ Human Approves      │ │ Human Comments          │
                    │ (done)              │ │ (in_progress)           │
                    │                     │ │ Reset & re-execute      │
                    └─────────────────────┘ └─────────────────────────┘
```

**Convergence Loop Notes:**
- No maximum iterations limit
- Agent reorder during execution: New order applies from next iteration only

### Convergence Loop Logic

```typescript
// Pseudo-code for routing service
async function executeTask(taskId: string) {
  const task = await getTask(taskId)
  const agents = await getAgents(task.workspaceId)

  let iteration = 1

  while (true) {
    let anyAgentWorked = false

    // Execute all agents in order
    for (let i = 0; i < agents.length; i++) {
      const result = await executeAgent(task, agents[i])

      if (result === 'comment') {
        anyAgentWorked = true
      } else if (result === 'error') {
        // Error counts as "agent worked" for convergence loop
        anyAgentWorked = true
      }
      // result === 'skip' → continue to next agent
    }

    // Check if we should loop again
    if (!anyAgentWorked) {
      // No agent did any work → task is ready for review
      await updateTaskStatus(taskId, 'in_review')
      break
    }

    // At least one agent worked → loop again
    iteration++
    // Continue to next iteration...
  }
}
```

### Task Input JSON

Written to `{os.tmpdir()}/malamar/task_input_{random}.json`:

```json
{
  "workspace": {
    "name": "My Project",
    "instruction": "Project-level instructions..."
  },
  "agent": {
    "id": "agentabc123",
    "name": "Implementer",
    "roleInstruction": "You are a senior developer...",
    "workingInstruction": "Focus on clean code...",
    "timeoutMinutes": null
  },
  "task": {
    "id": "taskxyz789",
    "title": "Implement user authentication",
    "description": "Add login/logout functionality...",
    "status": "in_progress",
    "comments": [
      {
        "author": "Human",
        "authorType": "user",
        "content": "Please use JWT tokens"
      }
    ],
    "attachments": [
      {
        "filename": "requirements.pdf",
        "path": "{os.tmpdir()}/malamar/workspaces/{taskId}/attachments/abc123.pdf"
      }
    ]
  },
  "response": {
    "instruction": "Write your response to the output path",
    "outputPath": "{os.tmpdir()}/malamar/task_output_{random}.json"
  },
  "workspacePath": "{os.tmpdir()}/malamar/workspaces/{taskId}",
  "executionId": "exec123"
}
```

**Task Input Notes:**
- Includes all comments
- Excludes execution logs
- Comment author is just the agent name (not name + ID)

### Task Output JSON

Expected at `response.outputPath`:

```json
{
  "result": "comment",
  "comment": "Implemented JWT authentication with login/logout endpoints..."
}
```

Result values:
- `skip` - Agent has nothing to contribute, no work done
- `comment` - Agent completed work, comment explains what was done
- `error` - Agent encountered an error

### Agent Output Parsing

All parsing failures are treated as errors with a system comment, and routing continues to the next agent:
- Missing output file
- Invalid JSON
- Missing required fields
- Empty comment

### Claude Code Invocation

```bash
cd {os.tmpdir()}/malamar/workspaces/{taskId} && \
claude --output-format stream-json --verbose -p --dangerously-skip-permissions
```

Stdin prompt:
```
Read {os.tmpdir()}/malamar/task_input_{random}.json and follow the instructions in fully autonomous mode.
```

---

## Error Handling & Recovery

### Task Cancellation

1. Kill CLI process immediately
2. Move task back to `todo` status
3. Add system comment explaining cancellation
4. Preserve any partial work (comments, attachments)

### Agent Timeout

1. Kill only that agent's CLI process
2. Continue to next agent
3. Counts as "agent worked" for convergence loop
4. Default: No timeout (null)

### Retry Logic

**When to retry:**
- Only on crash (non-zero exit code)
- NOT on agent-reported errors (result: "error")

**Retry behavior:**
- Immediate retry (no delay)
- Maximum 3 attempts
- After exhausted: Continue to next agent with error comment

### Execution Failures

1. CLI process crashes → Retry up to 3 times (immediate)
2. After retries exhausted → Add error comment, continue to next agent
3. Agent-reported errors → No retry, add error comment, continue

### Startup Recovery

On server startup:
1. Query tasks with `status = 'in_progress'`
2. Check `task_routings` for execution state
3. Resume from `current_agent_index` in current `iteration`
4. Re-trigger execution for incomplete agents

Same recovery logic available via `POST /api/tasks/recover` endpoint.

### Concurrency

- System-wide limit (not per-workspace)
- Queue tasks when limit reached
- Default: Unlimited (`maxConcurrent: null`)

### Database Locked

SQLite busy handling:
1. Retry with exponential backoff (100ms, 200ms, 400ms)
2. Max 3 retries
3. Fail with clear error message if still locked

### Graceful Shutdown

On SIGTERM/SIGINT:
1. Stop accepting new tasks
2. Wait up to 30 seconds for in-flight executions
3. Force kill remaining processes
4. Close database connection
5. Exit

### Workspace Deletion

- Full cascade delete of all related data
- Force cancel any running tasks
- Silent error handling for missing files

### Task Workspace Cleanup

Task workspace directories in temp are not actively cleaned up. OS handles temp directory cleanup.

---

## Logging

### Request Logging Format

```
GET /api/workspaces 200 12ms
POST /api/tasks 201 45ms
DELETE /api/workspaces/abc123 204 23ms
```

### Application Log Format

**Pretty (default, TTY):**
```
[2025-01-14 12:00:00] INFO  Server started on port 3456
[2025-01-14 12:00:01] DEBUG Loading config from /Users/x/.malamar/config.json
[2025-01-14 12:00:02] ERROR Failed to connect: ECONNREFUSED
```

**JSON (for piping/files):**
```json
{"level":"info","time":"2025-01-14T12:00:00.000Z","msg":"Server started","port":3456}
{"level":"error","time":"2025-01-14T12:00:02.000Z","msg":"Failed to connect","error":"ECONNREFUSED"}
```

### Configuration

```bash
# Format: pretty (default), json, auto
malamar --log-format json
MALAMAR_LOG_FORMAT=json

# Level: info (default), debug, warn, error
malamar --log-level debug
MALAMAR_LOG_LEVEL=debug
```

---

## Build Process

### Makefile

```makefile
.PHONY: dev-ui dev-server build clean test

# Development
dev-ui:
	cd ui && bun run dev

dev-server:
	cd server && bun run dev

# Build
build: build-ui build-server

build-ui:
	cd ui && bun run build
	rm -rf server/public
	cp -r ui/dist server/public

build-server:
	cd server && bun build --compile --outfile ../malamar ./src/index.ts

# Cross-platform builds
build-all: build-ui
	cd server && bun build --compile --target=bun-darwin-arm64 --outfile ../dist/malamar-darwin-arm64 ./src/index.ts
	cd server && bun build --compile --target=bun-darwin-x64 --outfile ../dist/malamar-darwin-x64 ./src/index.ts
	cd server && bun build --compile --target=bun-linux-x64 --outfile ../dist/malamar-linux-x64 ./src/index.ts
	cd server && bun build --compile --target=bun-linux-arm64 --outfile ../dist/malamar-linux-arm64 ./src/index.ts
	cd server && bun build --compile --target=bun-windows-x64 --outfile ../dist/malamar-windows-x64.exe ./src/index.ts

# Testing
test:
	cd server && bun test

test-e2e:
	cd server && bun test --test-name-pattern="e2e"

# Utilities
clean:
	rm -rf malamar malamar.exe dist ui/dist server/public

version:
	@cat server/package.json | grep '"version"' | head -1
```

### Development Workflow

```bash
# Terminal 1: UI dev server (hot reload)
make dev-ui
# → http://localhost:5173

# Terminal 2: Server (watch mode)
make dev-server
# → http://localhost:3456 (proxies unknown routes to UI dev server)
```

### Release Build

```bash
# Single platform (current machine)
make build
# → ./malamar (or malamar.exe on Windows)

# All platforms
make build-all
# → ./dist/malamar-darwin-arm64
# → ./dist/malamar-darwin-x64
# → ./dist/malamar-linux-x64
# → ./dist/malamar-linux-arm64
# → ./dist/malamar-windows-x64.exe
```

### Version

Version is read from `server/package.json` at build time.

---

## Testing Strategy

### Test Runner

Bun's built-in test runner (`bun test`).

### Test Structure

```
server/
├── src/
│   └── modules/
│       ├── core/
│       │   └── __tests__/
│       │       ├── config.test.ts
│       │       └── database.test.ts
│       ├── workspaces/
│       │   └── __tests__/
│       │       ├── service.test.ts
│       │       └── repository.test.ts
│       └── ...
├── e2e/
│   ├── setup.ts              # E2E test setup
│   ├── workspaces.e2e.ts     # Workspace API tests
│   ├── tasks.e2e.ts          # Task API tests
│   └── execution.e2e.ts      # Full execution flow (requires Claude CLI)
```

### E2E Tests

E2E tests assume:
- Claude Code is installed
- Claude Code is authenticated
- Tests run on a real machine (not CI)

```typescript
// e2e/execution.e2e.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'

describe('Task Execution E2E', () => {
  beforeAll(async () => {
    // Start server, create test workspace
  })

  afterAll(async () => {
    // Cleanup
  })

  test('executes task through all agents', async () => {
    // Create task
    // Wait for execution
    // Verify comments, status
  })
})
```

---

## UI Requirements (Specs Only)

> Note: UI implementation is handled separately. These are the requirements.

### Pages

1. **Dashboard** (Landing page)
   - Recent activity feed
   - CLI status (configured/not configured)
   - Recent workspaces (most recently used)
   - Recent tasks (most recently updated)
   - Quick links to settings

2. **Workspaces List**
   - Create/edit/delete workspaces
   - Workspace cards with task counts

3. **Workspace Detail** (Kanban board)
   - Columns: Todo, In Progress, In Review, Done
   - Drag-and-drop task management
   - Task cards with status, agent progress

4. **Workspace Settings**
   - Workspace name, instruction
   - Agent CRUD (create, reorder, edit, delete)
   - Task templates management

5. **Task Detail** (Modal or page)
   - Title, description
   - Status management
   - Comments thread
   - Attachments
   - Execution history

6. **Executions**
   - List of all executions
   - Filter by workspace, task, status
   - View execution logs

7. **Settings** (Global)
   - CLI configuration (path, health check)
   - Max concurrent tasks
   - Theme toggle (dark/light)

### Features

- Dark/light theme from day 1
- SSE-based real-time updates
- CLI status banner (when not configured)
- Responsive design

---

## Implementation Phases

### Phase 1: Foundation

- [ ] Project setup (server/, ui/, Makefile)
- [ ] Core module (config, database, logger, errors)
- [ ] SQLite schema and migration runner
- [ ] Basic Hono app structure
- [ ] Health endpoint

### Phase 2: CRUD APIs

- [ ] Workspaces module (CRUD + settings)
- [ ] Agents module (CRUD + reorder)
- [ ] Tasks module (CRUD + comments + attachments)
- [ ] Task templates module

### Phase 3: Execution Engine

- [ ] Executor module (pool, Claude adapter)
- [ ] Routing module (sequential orchestration with convergence loop)
- [ ] Executions module (records, logs)
- [ ] Task recovery on startup

### Phase 4: Real-time & Events

- [ ] Events module (SSE implementation)
- [ ] General event stream
- [ ] Execution log streaming

### Phase 5: CLI & Polish

- [ ] CLI argument parsing
- [ ] Import/export commands
- [ ] Settings module (global config API)
- [ ] Graceful shutdown
- [ ] Error handling refinement

### Phase 6: Build & Release

- [ ] UI build integration
- [ ] Static asset embedding
- [ ] Cross-platform builds
- [ ] GitHub release automation

### Phase 7: Testing

- [ ] Unit tests for core modules
- [ ] Integration tests for APIs
- [ ] E2E tests (with real Claude CLI)

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun | Built-in SQLite, TypeScript native, single binary compile |
| HTTP Framework | Hono | Lightweight (14KB), Bun-native, good middleware support |
| Database | SQLite (raw SQL) | Zero dependencies, simple schema, full control |
| ORM | None (raw SQL) | Minimal deps, 9 simple tables, easier to maintain |
| Real-time | SSE | Simpler than WebSocket, sufficient for updates |
| Authentication | None | Single-user local tool, unnecessary complexity |
| Task Routing | Sequential with convergence | Simpler than AI routing, predictable, cost-effective |
| Settings Storage | JSON values | Type preservation, flexible, future-proof |
| CLI Support | Claude Code only (v1) | Architecture ready for multi-CLI |
| ID Format | Plain nanoid | No prefixes, simpler |
| Temp Directory | os.tmpdir() | Cross-platform compatibility |

---

## Version History

| Version | Description |
|---------|-------------|
| 0.0.1   | Initial standalone release |

---

## References

- [Pocketbase](https://pocketbase.io/) - Inspiration for single-binary design
- [Hono](https://hono.dev/) - Lightweight web framework
- [Bun](https://bun.sh/) - JavaScript runtime with SQLite support
