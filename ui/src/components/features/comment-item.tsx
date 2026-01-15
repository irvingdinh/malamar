import { Bot, User } from "lucide-react";

import type { Comment } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

interface CommentItemProps {
  comment: Comment;
}

const authorTypeConfig = {
  human: {
    label: "Human",
    icon: User,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  agent: {
    label: "Agent",
    icon: Bot,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  system: {
    label: "System",
    icon: Bot,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

export function CommentItem({ comment }: CommentItemProps) {
  const config = authorTypeConfig[comment.authorType] ?? authorTypeConfig.human;
  const Icon = config.icon;

  return (
    <article className="rounded-lg border bg-card p-4">
      <header className="mb-2 flex items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            config.className,
          )}
        >
          <Icon className="size-3" />
          {config.label}
        </span>
        <span className="text-sm font-medium">{comment.author}</span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(comment.createdAt)}
        </span>
      </header>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
      </div>
    </article>
  );
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
