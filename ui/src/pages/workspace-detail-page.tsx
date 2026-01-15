import { AlertCircle, ListTodo, Settings, Users } from "lucide-react";
import { useParams, useSearchParams } from "react-router";

import { AgentsList } from "@/components/features/agents-list";
import { TaskBoard } from "@/components/features/task-board";
import { TaskDetailModal } from "@/components/features/task-detail-modal";
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
  const [, setSearchParams] = useSearchParams();
  const { data: workspace, isLoading, isError, error } = useWorkspace(id);

  const handleTaskClick = (task: { id: string }) => {
    setSearchParams((prev) => {
      prev.set("task", task.id);
      return prev;
    });
  };

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
            <TaskBoard workspaceId={workspace.id} onTaskClick={handleTaskClick} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <WorkspaceSettingsTab workspaceId={workspace.id} />
          </TabsContent>
        </Tabs>

        <TaskDetailModal />
      </div>
    </AppLayout>
  );
}
