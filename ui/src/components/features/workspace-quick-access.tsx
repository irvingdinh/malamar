import { AlertCircle, ChevronRight, FolderKanban, Plus } from "lucide-react";
import { Link } from "react-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaces } from "@/hooks/use-workspaces";

export function WorkspaceQuickAccess() {
  const { data, isLoading, isError, error } = useWorkspaces({ pageSize: 5 });

  if (isLoading) {
    return <WorkspaceQuickAccessSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load workspaces"}
        </AlertDescription>
      </Alert>
    );
  }

  const workspaces = data?.data ?? [];

  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FolderKanban className="mb-3 size-12 text-muted-foreground/50" />
        <h3 className="mb-1 font-medium">No workspaces yet</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Create your first workspace to get started
        </p>
        <Button asChild>
          <Link to="/workspaces">
            <Plus className="mr-2 size-4" />
            Create Workspace
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workspaces.map((workspace) => (
        <Link
          key={workspace.id}
          to={`/workspaces/${workspace.id}`}
          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
              <FolderKanban className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{workspace.name}</p>
              <p className="text-xs text-muted-foreground">
                Updated {formatRelativeTime(workspace.updatedAt)}
              </p>
            </div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
      ))}

      {/* View All Link */}
      <div className="pt-2">
        <Button variant="outline" className="w-full" asChild>
          <Link to="/workspaces">
            View All Workspaces
            <ChevronRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function WorkspaceQuickAccessSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="size-9 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="size-5" />
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
