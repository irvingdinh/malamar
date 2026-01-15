import { AlertCircle, Loader2, Save } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { toast } from "@/lib/toast";

export function SettingsGlobal() {
  const { data: settings, isLoading, isError, error } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  // Get current CLI config for claude
  const cliConfig = settings?.clis?.find((cli) => cli.type === "claude");
  const currentMaxConcurrent = cliConfig?.maxConcurrent ?? null;

  // Render the form once settings are loaded
  if (isLoading) {
    return <SettingsGlobalSkeleton />;
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

  // This should not happen after loading completes successfully
  if (!settings) {
    return <SettingsGlobalSkeleton />;
  }

  return (
    <SettingsGlobalForm
      key={currentMaxConcurrent !== null ? String(currentMaxConcurrent) : "unlimited"}
      settings={settings}
      currentMaxConcurrent={currentMaxConcurrent}
      updateSettingsMutation={updateSettingsMutation}
    />
  );
}

interface SettingsGlobalFormProps {
  settings: NonNullable<ReturnType<typeof useSettings>["data"]>;
  currentMaxConcurrent: number | null;
  updateSettingsMutation: ReturnType<typeof useUpdateSettings>;
}

function SettingsGlobalForm({
  settings,
  currentMaxConcurrent,
  updateSettingsMutation,
}: SettingsGlobalFormProps) {
  // Initialize form state from settings
  const initialValue = currentMaxConcurrent !== null ? String(currentMaxConcurrent) : "";
  const [maxConcurrent, setMaxConcurrent] = useState<string>(initialValue);
  const [hasChanges, setHasChanges] = useState(false);

  const handleMaxConcurrentChange = (value: string) => {
    setMaxConcurrent(value);

    // Check if value has changed from original
    const numValue = value.trim() === "" ? null : parseInt(value, 10);
    setHasChanges(numValue !== currentMaxConcurrent);
  };

  const handleSave = async () => {
    // Parse value
    const numValue = maxConcurrent.trim() === "" ? null : parseInt(maxConcurrent, 10);

    // Validate
    if (numValue !== null && (isNaN(numValue) || numValue < 1)) {
      toast.error(
        "Invalid value",
        "Max concurrent executions must be a positive number or empty for unlimited"
      );
      return;
    }

    try {
      // Preserve existing CLI configs and update the claude CLI's maxConcurrent
      const existingClis = settings.clis ?? [];
      const updatedClis = existingClis.map((cli) => {
        if (cli.type === "claude") {
          return { ...cli, maxConcurrent: numValue };
        }
        return cli;
      });

      // If no claude CLI exists, add one
      if (!existingClis.some((cli) => cli.type === "claude")) {
        updatedClis.push({
          name: "claude",
          type: "claude",
          path: null,
          maxConcurrent: numValue,
        });
      }

      await updateSettingsMutation.mutateAsync({
        clis: updatedClis,
      });

      toast.success(
        "Settings saved",
        numValue
          ? `Max concurrent executions set to ${numValue}`
          : "Max concurrent executions set to unlimited"
      );
      setHasChanges(false);
    } catch (err) {
      toast.error(
        "Failed to save settings",
        err instanceof Error ? err.message : "An error occurred"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Max Concurrent Executions */}
      <div className="space-y-3">
        <Label htmlFor="max-concurrent" className="text-base">
          Max Concurrent Executions
        </Label>
        <p className="text-sm text-muted-foreground">
          Maximum number of CLI executions that can run simultaneously. Leave empty for
          unlimited.
        </p>
        <div className="flex items-center gap-3">
          <Input
            id="max-concurrent"
            type="number"
            min="1"
            value={maxConcurrent}
            onChange={(e) => handleMaxConcurrentChange(e.target.value)}
            placeholder="Unlimited"
            className="max-w-[200px]"
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        {settings.runtimeMaxConcurrent !== null &&
          settings.runtimeMaxConcurrent !== currentMaxConcurrent && (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Runtime Override Active</AlertTitle>
              <AlertDescription>
                Max concurrent is currently overridden by command-line argument:{" "}
                <code className="rounded bg-muted px-1">
                  {settings.runtimeMaxConcurrent}
                </code>
              </AlertDescription>
            </Alert>
          )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
        {hasChanges && (
          <span className="text-sm text-muted-foreground">You have unsaved changes</span>
        )}
      </div>
    </div>
  );
}

function SettingsGlobalSkeleton() {
  return (
    <div className="space-y-6">
      {/* Max Concurrent Executions Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-10 w-[200px]" />
      </div>

      {/* Save Button Skeleton */}
      <div className="pt-2">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
