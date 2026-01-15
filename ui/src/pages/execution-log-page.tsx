import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";

import { StreamingTerminal } from "@/components/features/terminal-log-viewer";
import { AppLayout } from "@/components/layout/app-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExecution } from "@/hooks/use-executions";

export function ExecutionLogPage() {
  const { id } = useParams<{ id: string }>();

  const { data: execution, isLoading, isError, error } = useExecution(id);

  const breadcrumbs = [
    { label: "Executions", href: "/executions" },
    { label: execution?.agentName ?? "Execution" },
    { label: "Logs" },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="flex h-full flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/executions">
              <ArrowLeft className="mr-2 size-4" />
              Back to Executions
            </Link>
          </Button>
          {execution && (
            <div className="text-sm text-muted-foreground">
              Execution {execution.id.slice(0, 8)} • {execution.agentName}
            </div>
          )}
        </div>

        {/* Error State */}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load execution"}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1">
            <Skeleton className="h-full min-h-[400px] w-full" />
          </div>
        )}

        {/* Terminal */}
        {!isLoading && !isError && id && (
          <div className="flex-1">
            <StreamingTerminal
              executionId={id}
              className="h-full min-h-[400px]"
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
