# Malamar

Single-binary, zero-configuration autonomous task orchestration.

## What is Malamar?

Malamar is an autonomous AI task orchestration system that runs as a standalone executable. Like Pocketbase, it's a single binary with embedded database, REST API, and optional web UI - no external dependencies required.

**Use Cases:**
- Automated code review pipelines (security, style, architecture agents)
- Multi-agent research and analysis workflows
- Autonomous coding assistants
- Task delegation to specialized AI agents

**Target Users:** Individual developers and self-hosters who want AI automation without infrastructure overhead.

## Quick Start

```bash
# Download the binary (or build from source)
make build

# Run the server
./malamar serve

# Server starts at http://localhost:4100
```

## How It Works

1. **Workspaces** organize your agents and tasks
2. **Agents** execute sequentially in defined order
3. **Tasks** flow through agents until convergence
4. **Comments** enable agent communication and iteration

### The Convergence Loop

When a task is triggered, agents execute in sequence:

```
Task Created → Agent 0 → Agent 1 → ... → Agent N
                                            ↓
                              ┌─────────────┴─────────────┐
                              │                           │
                        ANY commented?              ALL skipped?
                              │                           │
                              ↓                           ↓
                      Loop back to Agent 0        Task → in_review
```

- If **ANY agent comments** → loop restarts from Agent 0 (new iteration)
- If **ALL agents skip** → task moves to `in_review` for human review

This allows agents to iteratively refine their work until consensus.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Malamar                             │
├─────────────────────────────────────────────────────────────┤
│  REST API (Hono)                                            │
│  ├─ /api/workspaces      Workspace management               │
│  ├─ /api/tasks           Task CRUD and lifecycle            │
│  ├─ /api/agents          Agent configuration                │
│  ├─ /api/executions      Execution records and logs         │
│  ├─ /api/events          SSE real-time streaming            │
│  └─ /api/routing         Execution triggers                 │
├─────────────────────────────────────────────────────────────┤
│  Execution Pipeline                                         │
│  ├─ Routing Service      Orchestrates convergence loop      │
│  ├─ Executor Service     Manages CLI spawning & pooling     │
│  └─ CLI Adapters         Claude Code (more coming)          │
├─────────────────────────────────────────────────────────────┤
│  SQLite + WAL            Embedded database                  │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

```bash
./malamar [command] [options]

Commands:
  serve (default)    Start the server
  export             Export data to JSON
  import             Import data from JSON
  help               Show help
  version            Show version

Options:
  --port             HTTP port (default: 4100)
  --data-dir         Data directory (default: ~/.malamar)
  --claude-path      Path to Claude CLI executable
  --log-level        debug|info|warn|error
  --log-format       pretty|json
```

**Environment Variables:**
- `MALAMAR_PORT` - HTTP port
- `MALAMAR_DATA_DIR` - Data directory
- `MALAMAR_LOG_LEVEL` - Log level
- `MALAMAR_LOG_FORMAT` - Log format

## API Overview

### Workspaces
```bash
GET    /api/workspaces              # List workspaces
POST   /api/workspaces              # Create workspace
GET    /api/workspaces/:id          # Get workspace
PATCH  /api/workspaces/:id          # Update workspace
DELETE /api/workspaces/:id          # Delete workspace
```

### Tasks
```bash
GET    /api/workspaces/:id/tasks    # List tasks in workspace
POST   /api/workspaces/:id/tasks    # Create task (triggers routing)
GET    /api/tasks/:id               # Get task
PATCH  /api/tasks/:id               # Update task
DELETE /api/tasks/:id               # Delete task
POST   /api/tasks/:id/cancel        # Cancel running task
POST   /api/tasks/:id/restart       # Restart task
```

### Agents
```bash
GET    /api/workspaces/:id/agents   # List agents (ordered)
POST   /api/workspaces/:id/agents   # Create agent
PATCH  /api/agents/:id              # Update agent
DELETE /api/agents/:id              # Delete agent
```

### Real-time Events
```bash
GET    /api/events                  # SSE stream (all events)
GET    /api/events/executions/:id/logs  # SSE stream (execution logs)
```

## Development

```bash
# Install dependencies
make install

# Run with hot reload
make dev-server

# Run tests
make test        # Integration tests
make test-e2e    # End-to-end tests

# Build
make build       # Single binary
make build-all   # Cross-platform builds
```

## Web UI

Malamar includes an optional web interface for managing workspaces, agents, and tasks.

See [ui/README.md](./ui/README.md) for UI-specific documentation.

### Quick Start (UI Development)

```bash
cd ui
bun install
bun run dev
# UI available at http://localhost:5173
```

## Roadmap

- [ ] Multi-CLI adapters (Gemini CLI, OpenAI Codex CLI, OpenCode)
- [ ] Per-agent CLI selection (mix different AI tools in one workflow)
- [ ] Scheduled/cron task triggers
- [x] Web UI dashboard (in progress)

## License

MIT
