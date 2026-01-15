import { AlertCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteWorkspaceSetting,
  useSetWorkspaceSetting,
  useWorkspaceSettings,
} from "@/hooks/use-workspace";
import { toast } from "@/lib/toast";

interface WorkspaceSettingsTabProps {
  workspaceId: string;
}

export function WorkspaceSettingsTab({
  workspaceId,
}: WorkspaceSettingsTabProps) {
  const { data: settings, isLoading, isError, error } = useWorkspaceSettings(
    workspaceId,
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const [deletingSetting, setDeletingSetting] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
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

  const settingsArray = Object.entries(settings || {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Workspace Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure workspace-specific key-value settings.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" />
          Add Setting
        </Button>
      </div>

      {settingsArray.length === 0 ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>No settings</AlertTitle>
          <AlertDescription>
            No settings have been configured for this workspace yet.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {settingsArray.map(([key, value]) => {
            const displayValue =
              typeof value === "string" ? value : JSON.stringify(value);
            return (
              <SettingItem
                key={key}
                settingKey={key}
                settingValue={displayValue}
                onEdit={() => setEditingSetting({ key, value: displayValue })}
                onDelete={() => setDeletingSetting(key)}
              />
            );
          })}
        </div>
      )}

      <SettingFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        workspaceId={workspaceId}
        mode="add"
      />

      {editingSetting && (
        <SettingFormDialog
          key={editingSetting.key}
          open={!!editingSetting}
          onOpenChange={(open) => !open && setEditingSetting(null)}
          workspaceId={workspaceId}
          mode="edit"
          initialKey={editingSetting.key}
          initialValue={editingSetting.value}
        />
      )}

      {deletingSetting && (
        <DeleteSettingDialog
          open={!!deletingSetting}
          onOpenChange={(open) => !open && setDeletingSetting(null)}
          workspaceId={workspaceId}
          settingKey={deletingSetting}
        />
      )}
    </div>
  );
}

interface SettingItemProps {
  settingKey: string;
  settingValue: string;
  onEdit: () => void;
  onDelete: () => void;
}

function SettingItem({
  settingKey,
  settingValue,
  onEdit,
  onDelete,
}: SettingItemProps) {
  return (
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-sm font-medium">{settingKey}</div>
        <div className="truncate text-sm text-muted-foreground">
          {settingValue}
        </div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label={`Edit ${settingKey}`}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label={`Delete ${settingKey}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

interface SettingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  mode: "add" | "edit";
  initialKey?: string;
  initialValue?: string;
}

function SettingFormDialog({
  open,
  onOpenChange,
  workspaceId,
  mode,
  initialKey = "",
  initialValue = "",
}: SettingFormDialogProps) {
  const [key, setKey] = useState(initialKey);
  const [value, setValue] = useState(initialValue);

  const setSettingMutation = useSetWorkspaceSetting();

  const isValid = key.trim().length > 0;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setKey(initialKey);
      setValue(initialValue);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }

      await setSettingMutation.mutateAsync({
        workspaceId,
        key: key.trim(),
        value: parsedValue,
      });

      toast.success(
        mode === "add" ? "Setting added" : "Setting updated",
        `"${key.trim()}" has been ${mode === "add" ? "added" : "updated"}.`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Failed to ${mode === "add" ? "add" : "update"} setting`,
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "add" ? "Add Setting" : "Edit Setting"}
            </DialogTitle>
            <DialogDescription>
              {mode === "add"
                ? "Add a new key-value setting to this workspace."
                : "Edit the value for this setting."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="setting-key">Key</Label>
              <Input
                id="setting-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="setting_key"
                disabled={mode === "edit" || setSettingMutation.isPending}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setting-value">Value</Label>
              <Input
                id="setting-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="value (JSON or plain text)"
                disabled={setSettingMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Enter a JSON value or plain text. JSON values like{" "}
                <code className="rounded bg-muted px-1">true</code>,{" "}
                <code className="rounded bg-muted px-1">123</code>, or{" "}
                <code className="rounded bg-muted px-1">{`{"key":"value"}`}</code>{" "}
                will be parsed automatically.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={setSettingMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || setSettingMutation.isPending}
            >
              {setSettingMutation.isPending
                ? "Saving..."
                : mode === "add"
                  ? "Add"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteSettingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  settingKey: string;
}

function DeleteSettingDialog({
  open,
  onOpenChange,
  workspaceId,
  settingKey,
}: DeleteSettingDialogProps) {
  const deleteSettingMutation = useDeleteWorkspaceSetting();

  const handleDelete = async () => {
    try {
      await deleteSettingMutation.mutateAsync({
        workspaceId,
        key: settingKey,
      });
      toast.success("Setting deleted", `"${settingKey}" has been deleted.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        "Failed to delete setting",
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={onOpenChange}
      resourceType="Setting"
      resourceName={settingKey}
      onConfirm={handleDelete}
      isLoading={deleteSettingMutation.isPending}
    />
  );
}
