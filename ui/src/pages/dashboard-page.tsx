import { Clock, FolderKanban } from "lucide-react";

import { ActivityOverview } from "@/components/features/activity-overview";
import { QuickStats } from "@/components/features/quick-stats";
import { WorkspaceQuickAccess } from "@/components/features/workspace-quick-access";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your workspaces and recent activity
          </p>
        </div>

        {/* Quick Stats */}
        <QuickStats />

        {/* Two Column Layout for Main Widgets */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Workspace Quick Access - takes 4 columns */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="size-5" />
                Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WorkspaceQuickAccess />
            </CardContent>
          </Card>

          {/* Activity Feed - takes 3 columns */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityOverview />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
