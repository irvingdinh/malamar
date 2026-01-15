import { AlertCircle, Paperclip } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaskAttachments } from "@/hooks/use-tasks";

import { AttachmentItem } from "./attachment-item";

interface TaskAttachmentsProps {
  taskId: string;
}

export function TaskAttachments({ taskId }: TaskAttachmentsProps) {
  const { data: attachments, isLoading, isError, error } = useTaskAttachments(taskId);

  if (isLoading) {
    return <TaskAttachmentsSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load attachments"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Paperclip className="mb-2 size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No attachments</p>
        <p className="text-xs text-muted-foreground">
          Files attached to this task will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <AttachmentItem key={attachment.id} attachment={attachment} taskId={taskId} />
      ))}
    </div>
  );
}

function TaskAttachmentsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="size-8 rounded" />
          <Skeleton className="size-8 rounded" />
        </div>
      ))}
    </div>
  );
}
