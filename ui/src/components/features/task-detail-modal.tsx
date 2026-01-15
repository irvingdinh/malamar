import { AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskStatus } from "@/hooks/use-tasks";
import { useTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

import { TaskComments } from "./task-comments";
import { TaskInfo } from "./task-info";

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

export function TaskDetailModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get("task");

  const { data: task, isLoading, isError, error } = useTask(taskId ?? undefined);

  const isOpen = !!taskId;

  const handleClose = () => {
    setSearchParams((prev) => {
      prev.delete("task");
      return prev;
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
      >
        {isLoading && (
          <>
            <SheetHeader className="pr-10">
              <SheetTitle className="sr-only">Loading task...</SheetTitle>
            </SheetHeader>
            <TaskDetailSkeleton />
          </>
        )}

        {isError && (
          <>
            <SheetHeader className="pr-10">
              <SheetTitle className="sr-only">Error loading task</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : "Failed to load task"}
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        {task && (
          <>
            <SheetHeader className="pr-10">
              <div className="flex items-start gap-3">
                <SheetTitle className="text-lg">{task.title}</SheetTitle>
                <StatusBadge status={task.status} />
              </div>
              <SheetDescription>
                Task details • Status: {statusConfig[task.status]?.label ?? "Unknown"}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              <TaskInfo task={task} />

              {/* Comments Section */}
              <section>
                <h4 className="mb-3 text-sm font-medium">Comments</h4>
                <TaskComments taskId={task.id} />
              </section>

              {/* Additional sections will be added in subsequent commits */}
              {/* Commit 5.5: Attachments section */}
              {/* Commit 5.7: Task Actions */}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status] ?? statusConfig.todo;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function TaskDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
