import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { type Task, type TaskStatus, useTasks } from "@/hooks/use-tasks";

import { TaskCard } from "./task-card";
import { TaskColumn } from "./task-column";

interface TaskBoardProps {
  workspaceId: string;
  onTaskClick?: (task: Task) => void;
}

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

export function TaskBoard({ workspaceId, onTaskClick }: TaskBoardProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, error } = useTasks(workspaceId, {
    limit: 200,
  });

  // Subscribe to real-time task events
  useGlobalEvents({
    handlers: {
      "task:created": (event) => {
        if (event.payload.workspaceId === workspaceId) {
          queryClient.invalidateQueries({
            queryKey: ["workspace", workspaceId, "tasks"],
          });
        }
      },
      "task:updated": (event) => {
        if (event.payload.workspaceId === workspaceId) {
          queryClient.invalidateQueries({
            queryKey: ["workspace", workspaceId, "tasks"],
          });
        }
      },
      "task:deleted": (event) => {
        if (event.payload.workspaceId === workspaceId) {
          queryClient.invalidateQueries({
            queryKey: ["workspace", workspaceId, "tasks"],
          });
        }
      },
    },
    enabled: true,
  });

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    const tasks = data?.tasks || [];
    if (!searchQuery.trim()) {
      return tasks;
    }
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query),
    );
  }, [data?.tasks, searchQuery]);

  const tasksByStatus = useMemo(
    () => groupTasksByStatus(filteredTasks),
    [filteredTasks],
  );

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

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => {
          const columnTasks = tasksByStatus[status] || [];
          return (
            <TaskColumn key={status} status={status} count={columnTasks.length}>
              {columnTasks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-4">
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No matching tasks" : "No tasks"}
                  </p>
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
    </div>
  );
}

function TaskBoardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full" />
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
