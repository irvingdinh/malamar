import { AlertCircle, Clock, Play } from "lucide-react";
import { useState } from "react";

import { AppLayout } from "@/components/layout/app-layout";
import { ListFilters } from "@/components/molecules/list-filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type Execution,
  type ExecutionResult,
  type ExecutionStatus,
  useExecutions,
} from "@/hooks/use-executions";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type StatusFilter = ExecutionStatus | "all";

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
];

const statusConfig: Record<ExecutionStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  running: {
    label: "Running",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
};

const resultConfig: Record<NonNullable<ExecutionResult>, { label: string; className: string }> = {
  skip: {
    label: "Skip",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  comment: {
    label: "Comment",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  error: {
    label: "Error",
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
};

function formatDuration(startedAt: number | null, completedAt: number | null): string {
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

export function ExecutionsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useExecutions({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: PAGE_SIZE,
  });

  const executions = data?.executions ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setPage(i)}
              isActive={page === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setPage(1)}
            isActive={page === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>,
      );

      if (page > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setPage(i)}
              isActive={page === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>,
        );
      }

      if (page < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>,
        );
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setPage(totalPages)}
            isActive={page === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <AppLayout breadcrumbs={[{ label: "Executions" }]}>
      <div className="space-y-6">
        <div aria-live="polite" className="sr-only">
          {isLoading
            ? "Loading executions"
            : `${total} execution${total !== 1 ? "s" : ""} found`}
        </div>

        <ListFilters>
          <Tabs value={statusFilter} onValueChange={handleStatusChange}>
            <TabsList>
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ListFilters>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load executions"}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {!isLoading && !isError && executions.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No executions found</AlertTitle>
            <AlertDescription>
              {statusFilter !== "all"
                ? `No ${statusFilter} executions found. Try a different filter.`
                : "No executions yet. Start a task to see executions here."}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && executions.length > 0 && (
          <ul className="space-y-2" role="list">
            {executions.map((execution) => (
              <li key={execution.id}>
                <ExecutionRow execution={execution} />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={
                    page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }
                />
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={
                    page === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  );
}

function ExecutionRow({ execution }: { execution: Execution }) {
  const statusCfg = statusConfig[execution.status];
  const resultCfg = execution.result ? resultConfig[execution.result] : null;
  const duration = formatDuration(execution.startedAt, execution.completedAt);

  return (
    <div className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          {execution.status === "running" ? (
            <Play className="h-4 w-4 animate-pulse text-blue-500" aria-hidden="true" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="font-medium">{execution.agentName}</span>
        </div>
        <span className="text-sm text-muted-foreground" aria-label={`Execution ID: ${execution.id.slice(0, 8)}`}>
          {execution.id.slice(0, 8)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          aria-label={`Status: ${statusCfg.label}`}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusCfg.className,
          )}
        >
          {statusCfg.label}
        </span>

        {resultCfg && (
          <span
            aria-label={`Result: ${resultCfg.label}`}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              resultCfg.className,
            )}
          >
            {resultCfg.label}
          </span>
        )}

        <span className="text-sm text-muted-foreground" aria-label={`Duration: ${duration}`}>
          {duration}
        </span>

        <span className="text-xs text-muted-foreground">
          {formatTimestamp(execution.createdAt)}
        </span>
      </div>
    </div>
  );
}
