import { createBrowserRouter } from "react-router";

import { DashboardPage } from "@/pages/dashboard-page.tsx";
import { WorkspaceDetailPage } from "@/pages/workspace-detail-page.tsx";
import { WorkspacesPage } from "@/pages/workspaces-page.tsx";

export const router = createBrowserRouter([
  { path: "/", element: <DashboardPage /> },
  { path: "/workspaces", element: <WorkspacesPage /> },
  { path: "/workspace/:id", element: <WorkspaceDetailPage /> },
]);
