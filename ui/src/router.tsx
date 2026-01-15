import { createBrowserRouter } from "react-router";

import { AnalyticsPage } from "@/pages/analytics-page.tsx";
import { DashboardPage } from "@/pages/dashboard-page.tsx";
import { ExecutionLogPage } from "@/pages/execution-log-page.tsx";
import { ExecutionsPage } from "@/pages/executions-page.tsx";
import { SettingsPage } from "@/pages/settings-page.tsx";
import { WorkspaceDetailPage } from "@/pages/workspace-detail-page.tsx";
import { WorkspacesPage } from "@/pages/workspaces-page.tsx";

export const router = createBrowserRouter([
  { path: "/", element: <DashboardPage /> },
  { path: "/workspaces", element: <WorkspacesPage /> },
  { path: "/workspace/:id", element: <WorkspaceDetailPage /> },
  { path: "/executions", element: <ExecutionsPage /> },
  { path: "/executions/:id/logs", element: <ExecutionLogPage /> },
  { path: "/analytics", element: <AnalyticsPage /> },
  { path: "/settings", element: <SettingsPage /> },
]);
