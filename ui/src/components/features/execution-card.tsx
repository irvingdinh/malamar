import { Clock, Play } from "lucide-react";

import type {
  Execution,
  ExecutionResult,
  ExecutionStatus,
} from "@/hooks/use-executions";
import { cn } from "@/lib/utils";

interface ExecutionCardProps {
  execution: Execution;
  onClick?: () => void;
}

const statusConfig: Record<
  ExecutionStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  running: {
    label: "Running",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
};

const resultConfig: Record<
  NonNullable<ExecutionResult>,
  { label: string; className: string }
> = {
  skip: {
    label: "Skip",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  comment: {
    label: "Comment",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
};

function formatDuration(
  startedAt: number | null,
  completedAt: number | null,
): string {
  if (!startedAt) return "-";
  const end = completedAt ?? Date.now();
  const durationMs = end - startedAt;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function ExecutionCard({ execution, onClick }: ExecutionCardProps) {
  const statusCfg = statusConfig[execution.status];
  const resultCfg = execution.result ? resultConfig[execution.result] : null;
  const duration = formatDuration(execution.startedAt, execution.completedAt);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Execution by ${execution.agentName}, status ${statusCfg.label}${resultCfg ? `, result ${resultCfg.label}` : ""}`}
      className={cn(
        "rounded-md border bg-card p-4 shadow-sm transition-colors",
        onClick &&
          "cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            {execution.status === "running" ? (
              <Play
                className="h-4 w-4 animate-pulse text-blue-500"
                aria-hidden="true"
              />
            ) : (
              <Clock
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <span className="font-medium">{execution.agentName}</span>
          </div>
          <span
            className="text-sm text-muted-foreground"
            title={execution.id}
          >
            {execution.id.slice(0, 8)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              statusCfg.className,
            )}
          >
            {statusCfg.label}
          </span>

          {resultCfg && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                resultCfg.className,
              )}
            >
              {resultCfg.label}
            </span>
          )}

          <span className="text-sm text-muted-foreground">{duration}</span>

          <span className="text-xs text-muted-foreground">
            {formatTimestamp(execution.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export { formatDuration, formatTimestamp, resultConfig, statusConfig };
