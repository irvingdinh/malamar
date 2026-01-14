# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Malamar is a single-binary, zero-configuration autonomous task orchestration system. It runs as a standalone executable (like Pocketbase) with embedded SQLite, REST API, and optional web UI.

## Design Philosophy

### Why Single-Binary?
Malamar follows the "Pocketbase model" - a self-contained executable that just works. No Docker, no PostgreSQL, no Redis. Download, run, done. This reduces operational complexity for individual developers and self-hosters.

### Why Sequential Execution?
Complex DAG workflows add cognitive overhead. Sequential execution with a convergence loop is:
- Easy to understand and debug
- Sufficient for most orchestration needs
- Naturally handles iterative refinement (agents loop until all skip)

### Why Comments for Communication?
Comments create a transparent, auditable conversation history. Agents read previous comments to understand context and decisions. Structured data passing or shared memory adds complexity without clear benefit for the target use cases.

### Trust the User
Malamar is designed for self-hosters running on their own machines:
- **No sandboxing** - agents have full filesystem access via CLI
- **No authentication** - single-user by design (run behind a reverse proxy if needed)
- **No iteration limits** - trust convergence, human can cancel if stuck
- **Local filesystem** - agents work directly on user's codebase

## Commands

```bash
# Development
make dev-server              # Run server with hot reload
make install                 # Install dependencies

# Build
make build                   # Build single binary to ./malamar
make build-all               # Cross-platform builds to ./dist/

# Testing
make test                    # Run integration tests (server/tests/)
make test-e2e                # Run e2e tests with real CLI (server/e2e/)

# Run single test file
cd server && bun test tests/tasks.test.ts
cd server && bun test e2e/claude.test.ts

# Lint & format
cd server && bun run lint
cd server && bun run format
```

## Architecture

### Module Structure (server/src/modules/)

Each module follows the same pattern:
- `index.ts` - Exports
- `routes.ts` - Hono route handlers
- `service.ts` - Business logic
- `repository.ts` - SQLite data access
- `types.ts` - TypeScript types

### Core Modules

- **core/** - Foundation: config, database, logger, errors, utilities
- **workspaces/** - Workspace CRUD + per-workspace settings
- **agents/** - Agent definitions with role/working instructions
- **tasks/** - Tasks, comments, attachments
- **templates/** - Task templates

### Execution Pipeline

- **routing/** - Orchestrates sequential agent execution with convergence loop
- **executor/** - Spawns Claude Code CLI, manages concurrency pool
- **executions/** - Execution records and streaming logs
- **events/** - SSE (Server-Sent Events) for real-time updates

### Supporting Modules

- **settings/** - Global settings API
- **recovery/** - Resume in-progress tasks on restart
- **lifecycle/** - Graceful shutdown handling

### Data Flow

```
Task Created → Routing Triggered → Agents Execute Sequentially
    ↓
Agent returns: skip | comment | error
    ↓
If ANY agent commented → Loop back to Agent 0 (new iteration)
If ALL agents skipped  → Task goes to in_review
```

### CLI Adapter Pattern

CLI adapters live in `server/src/modules/executor/adapters/`. Each adapter integrates a specific AI coding CLI:

- `claude.ts` - Claude Code CLI integration (current)
- (future) `gemini.ts` - Gemini CLI integration
- (future) `codex.ts` - OpenAI Codex CLI integration
- (future) `opencode.ts` - OpenCode integration

Each adapter implements:
1. **Command construction** - CLI args, flags, environment
2. **Input file format** - Task context JSON for the AI
3. **Output parsing** - Extract result (`skip`/`comment`/`error`) and content
4. **Stream handling** - Real-time log capture from CLI stdout

Agents will support per-agent CLI selection, allowing different AI tools in the same workflow.

### Key Files

- `server/src/app.ts` - Hono app composition, all routes mounted here
- `server/src/index.ts` - Entry point, CLI parsing, startup sequence
- `server/src/modules/executor/adapters/claude.ts` - Claude Code CLI adapter
- `server/src/modules/routing/service.ts` - Convergence loop logic

## Web UI (ui/)

### Tech Stack
- React 19 + TypeScript + Vite
- TailwindCSS 4 + shadcn/ui
- React Router 7 (Data Mode)

### Project Structure (ui/src/)
- `main.tsx` - Entry point with RouterProvider
- `router.tsx` - Route configuration
- `components/layout/` - AppLayout, AppSidebar, NavMain
- `components/ui/` - shadcn/ui components
- `pages/` - Page components
- `hooks/` - Custom hooks (API, real-time)
- `lib/` - Utilities, API client

### Key Patterns

**Layout Pattern:**
- AppLayout wraps all routes with sidebar + header
- Uses React Router's `<Outlet />` for nested routes

**API Integration:**
- Fetch wrapper with base URL configuration
- Custom hooks per domain (useWorkspaces, useTasks, etc.)
- Server state via TanStack Query (recommended)

**Real-time Updates:**
- SSE connection to `/api/events` for global events
- SSE connection to `/api/events/executions/:id/logs` for execution logs
- EventSource API with reconnection handling

**Component Conventions:**
- Pages in `pages/` directory, named `*-page.tsx`
- Feature components in `components/features/`
- Reusable UI in `components/ui/` (shadcn/ui)

### Commands
```bash
cd ui
bun run dev      # Development server
bun run build    # Production build
bun run lint     # ESLint
bun run preview  # Preview production build
```

### Build Pipeline
UI assets are built and embedded into the server binary during `make build`.
The server serves static files from the embedded filesystem at `/`.

## Testing

- **Integration tests** (`server/tests/`) - Use `app.fetch()` directly, no real server
- **E2E tests** (`server/e2e/`) - Spin up real HTTP server, execute actual Claude CLI

Test setup files export `factory` helpers for creating test data:
```typescript
const workspace = await factory.createWorkspace('Test')
const agent = await factory.createAgent(workspaceId, { name: 'Agent' })
const task = await factory.createTask(workspaceId, { title: 'Task' })
```

## Database

SQLite via `bun:sqlite`. Database stored at `$HOME/.malamar/malamar.db` (configurable via `--data-dir`).

Migrations are embedded in `server/src/modules/core/database.ts`.

## CLI Options

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
  --claude-path      Path to Claude CLI
  --log-level        debug|info|warn|error
  --log-format       pretty|json
```

## Roadmap & Future Direction

### High Priority
- **Multi-CLI Adapters**: Support for Gemini CLI, OpenAI Codex CLI, OpenCode
  - Per-agent CLI selection (mix different AI tools in one workflow)
  - Hardcoded adapter pattern (one file per CLI, not plugin-based)

### Future
- **Scheduled Tasks**: Cron-style task triggers for automated workflows

### In Progress
- **Web UI**: Dashboard for full management and real-time monitoring (see `ui/` directory)

### Intentionally Deferred
These are consciously out of scope to maintain simplicity:
- DAG/parallel agent execution (sequential is enough)
- Plugin/extension system (hardcoded adapters preferred)
- Enterprise features (RBAC, multi-tenant, audit logs)
- Sandboxing/isolation (trust the user's environment)
