import {
  AlertCircle,
  Calendar,
  Clock,
  Terminal,
  Timer,
  User,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Execution,
  ExecutionResult,
  ExecutionStatus,
} from "@/hooks/use-executions";
import { useExecution } from "@/hooks/use-executions";
import { cn } from "@/lib/utils";

import {
  formatDuration,
  formatTimestamp,
  resultConfig,
  statusConfig,
} from "./execution-card";

export function ExecutionDetailModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const executionId = searchParams.get("execution");

  const {
    data: execution,
    isLoading,
    isError,
    error,
  } = useExecution(executionId ?? undefined);

  const isOpen = !!executionId;

  const handleClose = () => {
    setSearchParams((prev) => {
      prev.delete("execution");
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
        className="flex w-full flex-col overflow-hidden sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
      >
        {isLoading && (
          <>
            <SheetHeader className="pr-10">
              <SheetTitle className="sr-only">Loading execution...</SheetTitle>
            </SheetHeader>
            <ExecutionDetailSkeleton />
          </>
        )}

        {isError && (
          <>
            <SheetHeader className="pr-10">
              <SheetTitle className="sr-only">Error loading execution</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : "Failed to load execution"}
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        {execution && (
          <>
            <SheetHeader className="pr-10">
              <div className="flex items-start gap-3">
                <SheetTitle className="text-lg">{execution.agentName}</SheetTitle>
                <StatusBadge status={execution.status} />
                {execution.result && <ResultBadge result={execution.result} />}
              </div>
              <SheetDescription>
                Execution {execution.id.slice(0, 8)} •{" "}
                {statusConfig[execution.status]?.label ?? "Unknown"} status
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              {/* Execution Info Section */}
              <section>
                <h4 className="mb-3 text-sm font-medium">Execution Details</h4>
                <ExecutionInfo execution={execution} />
              </section>

              {/* Output Section */}
              {execution.output && (
                <section>
                  <h4 className="mb-3 text-sm font-medium">Output</h4>
                  <div className="rounded-md border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap break-words text-sm">
                      {execution.output}
                    </pre>
                  </div>
                </section>
              )}

              {/* Actions Section */}
              <section className="border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/executions/${execution.id}/logs`}>
                      <Terminal className="mr-2 size-4" />
                      View Full Logs
                    </Link>
                  </Button>
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ExecutionInfoProps {
  execution: Execution;
}

function ExecutionInfo({ execution }: ExecutionInfoProps) {
  const duration = formatDuration(execution.startedAt, execution.completedAt);

  const infoItems = [
    {
      icon: User,
      label: "Agent",
      value: execution.agentName,
    },
    {
      icon: Terminal,
      label: "CLI Type",
      value: execution.cliType,
    },
    {
      icon: Timer,
      label: "Duration",
      value: duration,
    },
    {
      icon: Calendar,
      label: "Created",
      value: formatTimestamp(execution.createdAt),
    },
    ...(execution.startedAt
      ? [
          {
            icon: Clock,
            label: "Started",
            value: formatTimestamp(execution.startedAt),
          },
        ]
      : []),
    ...(execution.completedAt
      ? [
          {
            icon: Clock,
            label: "Completed",
            value: formatTimestamp(execution.completedAt),
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {infoItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <item.icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">{item.label}:</span>
          <span className="text-sm font-medium">{item.value}</span>
        </div>
      ))}
      <div className="col-span-full flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Execution ID:</span>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{execution.id}</code>
      </div>
      <div className="col-span-full flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Task ID:</span>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{execution.taskId}</code>
      </div>
      <div className="col-span-full flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Agent ID:</span>
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{execution.agentId}</code>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const config = statusConfig[status] ?? statusConfig.pending;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function ResultBadge({ result }: { result: NonNullable<ExecutionResult> }) {
  const config = resultConfig[result];
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function ExecutionDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
