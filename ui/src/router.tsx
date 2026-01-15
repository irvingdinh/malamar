import { createBrowserRouter } from "react-router";

import { DashboardPage } from "@/pages/dashboard-page.tsx";
import { WorkspacesPage } from "@/pages/workspaces-page.tsx";

export const router = createBrowserRouter([
  { path: "/", element: <DashboardPage /> },
  { path: "/workspaces", element: <WorkspacesPage /> },
]);
