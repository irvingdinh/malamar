import { Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment } from "@/hooks/use-tasks";
import { toast } from "@/lib/toast";

interface CommentFormProps {
  taskId: string;
}

export function CommentForm({ taskId }: CommentFormProps) {
  const [content, setContent] = useState("");

  const addCommentMutation = useAddComment();

  const isValid = content.trim().length > 0;
  const isPending = addCommentMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    try {
      await addCommentMutation.mutateAsync({
        taskId,
        author: "User",
        authorType: "human",
        content: content.trim(),
      });
      setContent("");
    } catch (error) {
      toast.error(
        "Failed to add comment",
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (isValid && !isPending) {
        handleSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment..."
        disabled={isPending}
        className="min-h-[80px] resize-none"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press <kbd className="rounded border px-1">Cmd</kbd>+
          <kbd className="rounded border px-1">Enter</kbd> to submit
        </p>
        <Button type="submit" size="sm" disabled={!isValid || isPending}>
          {isPending ? (
            "Sending..."
          ) : (
            <>
              <Send className="size-3.5" />
              Send
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
