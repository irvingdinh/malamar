import { useState } from "react";
import { useNavigate } from "react-router";

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
import {
  useDeleteWorkspace,
  useUpdateWorkspace,
  type Workspace,
} from "@/hooks/use-workspace";
import { toast } from "@/lib/toast";

interface WorkspaceEditDialogProps {
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceEditDialog({
  workspace,
  open,
  onOpenChange,
}: WorkspaceEditDialogProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(workspace.name);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const updateMutation = useUpdateWorkspace();
  const deleteMutation = useDeleteWorkspace();

  const hasChanges = name.trim() !== workspace.name;
  const isValid = name.trim().length > 0;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName(workspace.name);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || !hasChanges) return;

    try {
      await updateMutation.mutateAsync({
        id: workspace.id,
        name: name.trim(),
      });
      toast.success("Workspace updated", `"${name.trim()}" has been updated.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        "Failed to update workspace",
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ id: workspace.id, force: true });
      toast.success(
        "Workspace deleted",
        `"${workspace.name}" has been deleted.`,
      );
      setIsDeleteOpen(false);
      onOpenChange(false);
      navigate("/workspaces");
    } catch (error) {
      toast.error(
        "Failed to delete workspace",
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Workspace</DialogTitle>
              <DialogDescription>
                Make changes to your workspace here. Click save when you&apos;re
                done.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workspace name"
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsDeleteOpen(true)}
                disabled={updateMutation.isPending || deleteMutation.isPending}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !isValid || !hasChanges || updateMutation.isPending
                  }
                >
                  {updateMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        resourceType="Workspace"
        resourceName={workspace.name}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
