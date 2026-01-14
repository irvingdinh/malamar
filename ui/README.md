# Malamar Web UI

Web interface for Malamar task orchestration. Full management capabilities with real-time monitoring.

## Tech Stack

- React 19
- TypeScript
- Vite 7
- TailwindCSS 4
- shadcn/ui (New York style)
- React Router 7

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev
# UI available at http://localhost:5173

# Build for production
bun run build

# Preview production build
bun run preview

# Lint
bun run lint
```

## Architecture

### Project Structure

```
ui/src/
├── main.tsx                    # Entry point with RouterProvider
├── router.tsx                  # Route configuration
│
├── components/
│   ├── layout/                 # Layout components
│   │   ├── app-layout.tsx      # Root layout (sidebar + header + outlet)
│   │   ├── app-sidebar.tsx     # Navigation sidebar
│   │   └── nav-main.tsx        # Main navigation items
│   │
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── sidebar.tsx
│   │   └── ...
│   │
│   └── features/               # Feature-specific components (future)
│       ├── workspace-card.tsx
│       ├── task-list.tsx
│       └── ...
│
├── pages/                      # Page components
│   └── dashboard-page.tsx
│
├── hooks/                      # Custom hooks
│   ├── use-mobile.ts           # Mobile breakpoint detection
│   └── ...                     # API hooks (future)
│
├── lib/
│   ├── utils.ts                # Utilities (cn helper)
│   └── api.ts                  # API client (future)
│
└── styles/
    └── globals.css             # Global styles + Tailwind
```

### Component Patterns

**Layout Components** (`components/layout/`)
- `AppLayout` - Root layout wrapping all routes, provides sidebar and header
- Uses React Router's `<Outlet />` for nested route rendering
- Responsive sidebar with mobile sheet drawer

**Page Components** (`pages/`)
- Named `*-page.tsx` (e.g., `dashboard-page.tsx`)
- Each page is a route target
- Handle data fetching and page-level state

**Feature Components** (`components/features/`)
- Domain-specific reusable components
- Compose UI components with business logic
- Examples: `WorkspaceCard`, `TaskList`, `AgentForm`

**UI Components** (`components/ui/`)
- shadcn/ui components (Radix primitives + Tailwind)
- Pure presentational, no business logic
- Customized via CVA variants

### State Management

**Server State** (recommended approach)
- TanStack Query for data fetching, caching, and synchronization
- Custom hooks per domain: `useWorkspaces()`, `useTasks()`, `useAgents()`
- Automatic background refetching and cache invalidation

**Local State**
- React `useState` for component-level state
- React Context for cross-cutting concerns (theme, sidebar state)
- URL state via React Router for filters, pagination

### API Integration

**Base Configuration**
```typescript
// lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4100';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) throw new Error(response.statusText);
  return response.json();
}
```

**Endpoints**
- `GET/POST /api/workspaces` - Workspace management
- `GET/POST /api/workspaces/:id/tasks` - Task management
- `GET/POST /api/workspaces/:id/agents` - Agent management
- `GET /api/events` - SSE real-time events
- `GET /api/settings` - Global settings

### Real-time Updates

**SSE Integration**
```typescript
// Example: Subscribe to execution logs
const eventSource = new EventSource(`${API_BASE}/api/events/executions/${id}/logs`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle log update
};

eventSource.onerror = () => {
  // Reconnection logic
};
```

**Event Types**
- `task.created`, `task.updated`, `task.completed`
- `execution.started`, `execution.log`, `execution.completed`
- `agent.commented`, `agent.skipped`

## Pages

### Dashboard
- Overview statistics (workspaces, tasks, recent activity)
- Health check status
- CLI availability status

### Workspaces
- List all workspaces with search/filter
- Create new workspace
- Edit workspace settings
- Delete workspace (with confirmation)

### Tasks & Comments
- Task list with status filters (pending, in_progress, in_review, completed)
- Task detail view with full context
- Comment thread (agent comments + human replies)
- File attachments

### Agents
- Agent list (ordered by execution sequence)
- Create/edit agent (name, role, working instructions)
- Drag-to-reorder agents
- Per-agent CLI selection (future)

### Settings
- Global settings management
- CLI path configuration
- Health check status

## Build & Embed

### Development

```bash
bun run dev
```

Starts Vite dev server with HMR at `http://localhost:5173`.

### Production Build

```bash
bun run build
```

Outputs optimized assets to `ui/dist/`.

### Embedding in Server Binary

UI assets are embedded into the Malamar server binary during the build process:

1. `bun run build` compiles UI to `ui/dist/`
2. Server build embeds `ui/dist/` as static files
3. Server serves embedded files at `/` route
4. API endpoints remain at `/api/*`

This enables single-binary deployment with no separate web server needed.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:4100` | Backend API base URL |
