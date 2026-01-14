import { createBrowserRouter } from "react-router";

import { AppLayout } from "@/components/layout/app-layout.tsx";
import { DashboardPage } from "@/pages/dashboard-page.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [{ index: true, element: <DashboardPage /> }],
  },
]);
