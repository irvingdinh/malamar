import { RefreshCw, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import type { TaskDetail, TaskStatus } from "@/hooks/use-tasks";
import { useCancelTask, useDeleteTask, useRestartTask } from "@/hooks/use-tasks";
import { toast } from "@/lib/toast";

interface TaskActionsProps {
  task: TaskDetail;
  onClose: () => void;
}

export function TaskActions({ task, onClose }: TaskActionsProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const navigate = useNavigate();

  const cancelMutation = useCancelTask();
  const restartMutation = useRestartTask();
  const deleteMutation = useDeleteTask();

  const canCancel = task.status === "in_progress";
  const canRestart = task.status !== "in_progress";

  const handleCancel = () => {
    cancelMutation.mutate(
      { taskId: task.id },
      {
        onSuccess: () => {
          toast.success("Task cancelled", "The task has been cancelled.");
        },
        onError: (error) => {
          toast.error(
            "Failed to cancel task",
            error instanceof Error ? error.message : "An error occurred",
          );
        },
      },
    );
  };

  const handleRestart = () => {
    restartMutation.mutate(
      { taskId: task.id },
      {
        onSuccess: () => {
          toast.success("Task restarted", "The task has been queued for execution.");
        },
        onError: (error) => {
          toast.error(
            "Failed to restart task",
            error instanceof Error ? error.message : "An error occurred",
          );
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { taskId: task.id, workspaceId: task.workspaceId },
      {
        onSuccess: () => {
          toast.success("Task deleted", `${task.title} has been deleted.`);
          setIsDeleteOpen(false);
          onClose();
          navigate(`/workspaces/${task.workspaceId}`);
        },
        onError: (error) => {
          toast.error(
            "Failed to delete task",
            error instanceof Error ? error.message : "An error occurred",
          );
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Actions</h4>

      <div className="flex flex-wrap gap-2">
        {/* Cancel button - only for in_progress */}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
            className="gap-1.5"
          >
            <Square className="size-3.5" />
            {cancelMutation.isPending ? "Cancelling..." : "Cancel"}
          </Button>
        )}

        {/* Restart button - for non in_progress tasks */}
        {canRestart && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={restartMutation.isPending}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            {restartMutation.isPending ? "Restarting..." : "Restart"}
          </Button>
        )}

        {/* Delete button - always available */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDeleteOpen(true)}
          className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>

      {/* Status info */}
      <p className="text-xs text-muted-foreground">
        {getStatusHelpText(task.status)}
      </p>

      <ConfirmDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        resourceType="Task"
        resourceName={task.title}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function getStatusHelpText(status: TaskStatus): string {
  switch (status) {
    case "todo":
      return "This task is queued and waiting to be processed.";
    case "in_progress":
      return "This task is currently being processed by agents. You can cancel it to stop execution.";
    case "in_review":
      return "This task has been completed by agents and is ready for review.";
    case "done":
      return "This task has been marked as complete.";
    default:
      return "";
  }
}
