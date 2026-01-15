import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { type Task, type TaskStatus, useTasks } from "@/hooks/use-tasks";

import { TaskCard } from "./task-card";
import { TaskColumn } from "./task-column";

interface TaskBoardProps {
  workspaceId: string;
  onTaskClick?: (task: Task) => void;
}

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

export function TaskBoard({ workspaceId, onTaskClick }: TaskBoardProps) {
  const { data, isLoading, isError, error } = useTasks(workspaceId, {
    limit: 200,
  });

  if (isLoading) {
    return <TaskBoardSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load tasks"}
        </AlertDescription>
      </Alert>
    );
  }

  const tasks = data?.tasks || [];
  const tasksByStatus = groupTasksByStatus(tasks);

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => {
        const columnTasks = tasksByStatus[status] || [];
        return (
          <TaskColumn key={status} status={status} count={columnTasks.length}>
            {columnTasks.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-4">
                <p className="text-sm text-muted-foreground">No tasks</p>
              </div>
            ) : (
              columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={onTaskClick ? () => onTaskClick(task) : undefined}
                />
              ))
            )}
          </TaskColumn>
        );
      })}
    </div>
  );
}

function TaskBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => (
        <div
          key={status}
          className="flex min-w-[280px] flex-col rounded-lg border bg-muted/30"
        >
          <div className="flex items-center justify-between rounded-t-lg bg-muted px-3 py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-6 rounded-full" />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2">
            {Array.from({ length: status === "todo" ? 3 : 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const grouped: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };

  for (const task of tasks) {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  }

  return grouped;
}
