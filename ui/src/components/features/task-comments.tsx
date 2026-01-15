import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, MessageSquare } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { useTaskComments } from "@/hooks/use-tasks";

import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";

interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const queryClient = useQueryClient();
  const { data: comments, isLoading, isError, error } = useTaskComments(taskId);

  // Subscribe to real-time comment events
  useGlobalEvents({
    handlers: {
      "task:comment:added": (event) => {
        if (event.payload.taskId === taskId) {
          queryClient.invalidateQueries({
            queryKey: ["task", taskId, "comments"],
          });
        }
      },
    },
    enabled: true,
  });

  if (isLoading) {
    return <TaskCommentsSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load comments"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment form at top */}
      <CommentForm taskId={taskId} />

      {/* Comments list */}
      {!comments || comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MessageSquare className="mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground">
            Comments from agents and humans will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCommentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
