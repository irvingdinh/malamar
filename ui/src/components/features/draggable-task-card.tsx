import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MessageSquare, Paperclip } from "lucide-react";

import type { Task, TaskStatus } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

interface DraggableTaskCardProps {
  task: Task;
  commentCount?: number;
  attachmentCount?: number;
  onClick?: () => void;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo: {
    label: "To Do",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  in_review: {
    label: "In Review",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  done: {
    label: "Done",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
};

export function DraggableTaskCard({
  task,
  commentCount = 0,
  attachmentCount = 0,
  onClick,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const config = statusConfig[task.status] ?? statusConfig.todo;
  const hasIndicators = commentCount > 0 || attachmentCount > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  const handleClick = () => {
    // Only trigger onClick if not dragging
    if (!isDragging && onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-card p-3 shadow-sm transition-colors",
        onClick &&
          "cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDragging && "opacity-50",
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label={`Drag task: ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium leading-tight">{task.title}</h4>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                config.className,
              )}
            >
              {config.label}
            </span>
          </div>

          {task.description && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}

          {hasIndicators && (
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              {commentCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3.5" />
                  {commentCount}
                </span>
              )}
              {attachmentCount > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="size-3.5" />
                  {attachmentCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
