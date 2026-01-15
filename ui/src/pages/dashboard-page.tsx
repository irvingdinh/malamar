import { BarChart3, Clock, FolderKanban, Zap } from "lucide-react";

import { ActivityOverview } from "@/components/features/activity-overview";
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

        {/* Main Grid Layout */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Quick Stats Placeholder - will be replaced by QuickStats component */}
          <DashboardWidget
            icon={FolderKanban}
            title="Workspaces"
            description="Total workspaces"
          />
          <DashboardWidget
            icon={BarChart3}
            title="Tasks"
            description="Active tasks"
          />
          <DashboardWidget
            icon={Zap}
            title="Executions"
            description="Running now"
          />
          <DashboardWidget
            icon={Clock}
            title="Recent"
            description="Last 24 hours"
          />
        </div>

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

interface DashboardWidgetProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function DashboardWidget({ icon: Icon, title, description }: DashboardWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">--</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
