import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGlobalEvents } from "@/hooks/use-global-events";
import {
  type Task,
  type TaskStatus,
  useTasks,
  useUpdateTask,
} from "@/hooks/use-tasks";
import { toast } from "@/lib/toast";

import { DraggableTaskCard } from "./draggable-task-card";
import { DroppableTaskColumn } from "./droppable-task-column";
import { TaskCard } from "./task-card";
import { TaskCreateDialog } from "./task-create-dialog";

interface TaskBoardProps {
  workspaceId: string;
  onTaskClick?: (task: Task) => void;
}

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

// Define which status transitions are allowed via drag-and-drop
// Users cannot manually move tasks to in_progress (system-controlled)
const ALLOWED_DROP_STATUSES: TaskStatus[] = ["todo", "in_review", "done"];

function canDropToStatus(
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
): boolean {
  // Can't drop to the same status
  if (fromStatus === toStatus) return false;
  // Users cannot manually move tasks to in_progress
  if (toStatus === "in_progress") return false;
  return true;
}

export function TaskBoard({ workspaceId, onTaskClick }: TaskBoardProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const updateTaskMutation = useUpdateTask();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = filteredTasks.find((t) => t.id === taskId);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedTask = activeTask;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Use activeTask as fallback if task is not found in filteredTasks
    // (could happen if real-time updates modify the list during drag)
    const task = filteredTasks.find((t) => t.id === taskId) ?? draggedTask;
    if (!task) return;

    // Check if drop is allowed
    if (!canDropToStatus(task.status, newStatus)) {
      if (newStatus === "in_progress") {
        toast.error(
          "Cannot move to In Progress",
          "Tasks are moved to In Progress automatically when agents start working.",
        );
      }
      return;
    }

    // Optimistically update the UI
    // Query key must match useTasks: ["workspace", workspaceId, "tasks", { status, page, limit }]
    // We pass limit: 200, no status, page defaults to 1
    queryClient.setQueryData<{ tasks: Task[] }>(
      ["workspace", workspaceId, "tasks", { status: undefined, page: 1, limit: 200 }],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t,
          ),
        };
      },
    );

    // Update task status on the server
    updateTaskMutation.mutate(
      { taskId, status: newStatus },
      {
        onError: (err) => {
          toast.error(
            "Failed to update task",
            err instanceof Error ? err.message : "An error occurred",
          );
          // Revert on error by invalidating
          queryClient.invalidateQueries({
            queryKey: ["workspace", workspaceId, "tasks"],
          });
        },
      },
    );
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

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
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((status) => {
            const columnTasks = tasksByStatus[status] || [];
            const isDropDisabled = !ALLOWED_DROP_STATUSES.includes(status);
            return (
              <DroppableTaskColumn
                key={status}
                status={status}
                count={columnTasks.length}
                isDropDisabled={isDropDisabled}
              >
                {columnTasks.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center p-4">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "No matching tasks" : "No tasks"}
                    </p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <DraggableTaskCard
                      key={task.id}
                      task={task}
                      onClick={onTaskClick ? () => onTaskClick(task) : undefined}
                    />
                  ))
                )}
              </DroppableTaskColumn>
            );
          })}
        </div>

        {/* Drag overlay shows the card being dragged */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 opacity-90">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        workspaceId={workspaceId}
      />
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
