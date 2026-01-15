import { Calendar, Clock, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { TaskDetail } from "@/hooks/use-tasks";

import { TaskEditForm } from "./task-edit-form";

interface TaskInfoProps {
  task: TaskDetail;
}

export function TaskInfo({ task }: TaskInfoProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <TaskEditForm
        task={task}
        onCancel={() => setIsEditing(false)}
        onSuccess={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Description Section */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">Description</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-7 gap-1.5 text-xs"
          >
            <Pencil className="size-3" />
            Edit
          </Button>
        </div>
        {task.description ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {task.description}
            </p>
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No description provided.
          </p>
        )}
      </div>

      {/* Timestamps */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          <span>Created {formatDate(task.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span>Updated {formatRelativeTime(task.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

  return formatDate(timestamp);
}
