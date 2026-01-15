import type { TaskStatus } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

export interface TaskColumnProps {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}

const statusConfig: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string }
> = {
  todo: {
    label: "To Do",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800/50",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  in_review: {
    label: "In Review",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  done: {
    label: "Done",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
};

export function TaskColumn({ status, count, children }: TaskColumnProps) {
  const config = statusConfig[status] ?? statusConfig.todo;

  return (
    <div className="flex h-full min-w-[280px] flex-col rounded-lg border bg-muted/30">
      <div
        className={cn(
          "flex items-center justify-between rounded-t-lg px-3 py-2",
          config.bgColor,
        )}
      >
        <h3 className={cn("text-sm font-semibold", config.color)}>
          {config.label}
        </h3>
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-medium",
            config.bgColor,
            config.color,
          )}
        >
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {children}
      </div>
    </div>
  );
}

export function getStatusLabel(status: TaskStatus): string {
  return (statusConfig[status] ?? statusConfig.todo).label;
}
