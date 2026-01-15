import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TaskDetail } from "@/hooks/use-tasks";
import { useUpdateTask } from "@/hooks/use-tasks";
import { toast } from "@/lib/toast";

interface TaskEditFormProps {
  task: TaskDetail;
  onCancel: () => void;
  onSuccess: () => void;
}

export function TaskEditForm({ task, onCancel, onSuccess }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");

  const updateMutation = useUpdateTask();

  const isValid = title.trim().length > 0;
  const isPending = updateMutation.isPending;
  const hasChanges =
    title.trim() !== task.title ||
    (description.trim() || null) !== task.description;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || !hasChanges) return;

    try {
      await updateMutation.mutateAsync({
        taskId: task.id,
        title: title.trim(),
        description: description.trim() || null,
      });
      toast.success("Task updated", "Your changes have been saved.");
      onSuccess();
    } catch (error) {
      toast.error(
        "Failed to update task",
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-edit-title">Title</Label>
        <Input
          id="task-edit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-edit-description">Description</Label>
        <Textarea
          id="task-edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          className="min-h-[150px]"
          placeholder="Add a description..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || !hasChanges || isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
