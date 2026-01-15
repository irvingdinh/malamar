import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Terminal,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type CliHealthStatus,
  useCliHealth,
  useRefreshCliHealth,
  useSettings,
  useUpdateSettings,
} from "@/hooks/use-settings";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function SettingsCli() {
  const { data: settings, isLoading, isError, error } = useSettings();
  const { data: healthData, isLoading: healthLoading } = useCliHealth();
  const refreshHealthMutation = useRefreshCliHealth();
  const updateSettingsMutation = useUpdateSettings();

  const [editedPath, setEditedPath] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Get current CLI config
  const cliConfig = settings?.clis?.find((cli) => cli.type === "claude");
  const currentPath = cliConfig?.path ?? settings?.runtimeClaudePath ?? null;

  // Get health status from the latest refresh or initial data
  const health = refreshHealthMutation.data ?? healthData;

  const handleRefreshHealth = () => {
    refreshHealthMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Health check complete", "CLI status has been refreshed.");
      },
      onError: (error) => {
        toast.error(
          "Health check failed",
          error instanceof Error ? error.message : "An error occurred"
        );
      },
    });
  };

  const handleStartEdit = () => {
    setEditedPath(currentPath ?? "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedPath(null);
    setIsEditing(false);
  };

  const handleSavePath = async () => {
    const newPath = editedPath?.trim() || null;

    try {
      // Preserve existing non-claude CLIs for future multi-CLI support
      const existingClis =
        settings?.clis?.filter((cli) => cli.type !== "claude") ?? [];

      await updateSettingsMutation.mutateAsync({
        clis: [
          ...existingClis,
          {
            name: "claude",
            type: "claude",
            path: newPath,
          },
        ],
      });

      toast.success(
        "CLI path updated",
        newPath ? `Path set to: ${newPath}` : "Using system PATH"
      );
      setIsEditing(false);
      setEditedPath(null);

      // Refresh health after path change
      refreshHealthMutation.mutate(undefined, {
        onError: (err) => {
          toast.error(
            "Health check failed",
            err instanceof Error ? err.message : "An error occurred"
          );
        },
      });
    } catch (error) {
      toast.error(
        "Failed to update CLI path",
        error instanceof Error ? error.message : "An error occurred"
      );
    }
  };

  if (isLoading) {
    return <SettingsCliSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load settings"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base">CLI Status</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshHealth}
            disabled={refreshHealthMutation.isPending}
          >
            {refreshHealthMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
        </div>

        {healthLoading && !health ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-5" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          </div>
        ) : (
          <HealthStatusDisplay health={health} />
        )}
      </div>

      {/* CLI Path Configuration */}
      <div className="space-y-3">
        <Label htmlFor="cli-path" className="text-base">
          CLI Path
        </Label>
        <p className="text-sm text-muted-foreground">
          Configure the path to the Claude CLI executable. Leave empty to use the system
          PATH.
        </p>

        {isEditing ? (
          <div className="space-y-3">
            <Input
              id="cli-path"
              autoFocus
              value={editedPath ?? ""}
              onChange={(e) => setEditedPath(e.target.value)}
              placeholder="/usr/local/bin/claude"
              className="font-mono"
              disabled={updateSettingsMutation.isPending}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSavePath}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={updateSettingsMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2">
              <code className="text-sm">
                {currentPath ?? (
                  <span className="text-muted-foreground italic">
                    Using system PATH
                  </span>
                )}
              </code>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              aria-label="Edit CLI path"
            >
              Edit
            </Button>
          </div>
        )}

        {settings?.runtimeClaudePath && cliConfig?.path !== settings.runtimeClaudePath && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>Runtime Override Active</AlertTitle>
            <AlertDescription>
              CLI path is currently overridden by command-line argument:{" "}
              <code className="rounded bg-muted px-1">{settings.runtimeClaudePath}</code>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

interface HealthStatusDisplayProps {
  health: CliHealthStatus | undefined;
}

function HealthStatusDisplay({ health }: HealthStatusDisplayProps) {
  if (!health) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <Terminal className="size-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-muted-foreground">Status Unknown</p>
            <p className="text-sm text-muted-foreground">
              Click refresh to check CLI status
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isHealthy = health.installed && health.version;
  const checkedAt = new Date(health.checkedAt).toLocaleTimeString();

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isHealthy
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
          : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
      )}
    >
      <div className="flex items-start gap-3">
        {isHealthy ? (
          <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
        ) : (
          <XCircle className="size-5 text-red-600 dark:text-red-400" />
        )}
        <div className="flex-1 space-y-1">
          <p
            className={cn(
              "font-medium",
              isHealthy
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            )}
          >
            {isHealthy ? "CLI Available" : "CLI Not Available"}
          </p>
          {health.version && (
            <p className="text-sm text-muted-foreground">
              Version: <code className="rounded bg-muted px-1">{health.version}</code>
            </p>
          )}
          {health.path && (
            <p className="text-sm text-muted-foreground">
              Path: <code className="rounded bg-muted px-1">{health.path}</code>
            </p>
          )}
          {!isHealthy && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {health.path
                ? "CLI found but failed to execute. Check if the path is correct."
                : "CLI not found. Install Claude CLI or configure the path."}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Last checked: {checkedAt}</p>
        </div>
      </div>
    </div>
  );
}

function SettingsCliSkeleton() {
  return (
    <div className="space-y-6">
      {/* Health Status Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-5" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>
      </div>

      {/* CLI Path Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-64" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  );
}
