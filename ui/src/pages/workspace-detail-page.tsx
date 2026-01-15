import { AlertCircle, ListTodo, Settings, Users } from "lucide-react";
import { useParams } from "react-router";

import { AgentsList } from "@/components/features/agents-list";
import { WorkspaceHeader } from "@/components/features/workspace-header";
import { WorkspaceSettingsTab } from "@/components/features/workspace-settings-tab";
import { AppLayout } from "@/components/layout/app-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/use-workspace";

export function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: workspace, isLoading, isError, error } = useWorkspace(id);

  if (isLoading) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Workspaces", href: "/workspaces" },
          { label: "Loading..." },
        ]}
      >
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !workspace) {
    return (
      <AppLayout
        breadcrumbs={[
          { label: "Workspaces", href: "/workspaces" },
          { label: "Error" },
        ]}
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Failed to load workspace"}
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      breadcrumbs={[
        { label: "Workspaces", href: "/workspaces" },
        { label: workspace.name },
      ]}
    >
      <div className="space-y-6">
        <div aria-live="polite" className="sr-only">
          Workspace {workspace.name} loaded
        </div>

        <WorkspaceHeader workspace={workspace} />

        <Tabs defaultValue="agents" className="w-full">
          <TabsList>
            <TabsTrigger value="agents" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="mt-6">
            <AgentsList workspaceId={workspace.id} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="text-lg font-medium">Tasks</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                View and manage tasks in this workspace.
              </p>
              <div className="mt-4 text-sm text-muted-foreground">
                Task board coming soon...
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <WorkspaceSettingsTab workspaceId={workspace.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
