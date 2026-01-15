import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Play,
  Plus,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";

import type { AppEvent } from "@/hooks/use-global-events";
import { useGlobalEvents } from "@/hooks/use-global-events";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: AppEvent["type"];
  message: string;
  timestamp: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}

const MAX_ITEMS = 10;

export function ActivityOverview() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const handleEvent = useCallback((event: AppEvent) => {
    const activity = eventToActivity(event);
    if (activity) {
      setActivities((prev) => [activity, ...prev].slice(0, MAX_ITEMS));
    }
  }, []);

  const { status } = useGlobalEvents({
    onAnyEvent: handleEvent,
    enabled: true,
  });

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="mb-3 size-12 text-muted-foreground/50" />
        <h3 className="mb-1 font-medium">No recent activity</h3>
        <p className="text-sm text-muted-foreground">
          Activity will appear here as events occur
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "size-2 rounded-full",
              status === "connected" ? "bg-green-500" : "bg-yellow-500",
            )}
          />
          <span className="text-muted-foreground">
            {status === "connected" ? "Live updates active" : "Connecting..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Connection status indicator */}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span
          className={cn(
            "size-2 rounded-full",
            status === "connected" ? "bg-green-500" : "bg-yellow-500",
          )}
        />
        <span className="text-muted-foreground">
          {status === "connected" ? "Live" : "Reconnecting..."}
        </span>
      </div>

      {/* Activity list */}
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
        >
          <div
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
              activity.iconClassName,
            )}
          >
            <activity.icon className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm">{activity.message}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function eventToActivity(event: AppEvent): ActivityItem | null {
  const id = `${event.type}-${event.timestamp}-${Math.random()}`;

  switch (event.type) {
    case "task:created":
      return {
        id,
        type: event.type,
        message: `Task "${event.payload.name}" created`,
        timestamp: event.timestamp,
        icon: Plus,
        iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      };

    case "task:updated":
      return {
        id,
        type: event.type,
        message: `Task updated`,
        timestamp: event.timestamp,
        icon: CheckCircle2,
        iconClassName: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };

    case "task:deleted":
      return {
        id,
        type: event.type,
        message: "Task deleted",
        timestamp: event.timestamp,
        icon: XCircle,
        iconClassName: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      };

    case "task:comment:added":
      return {
        id,
        type: event.type,
        message: `Comment added by ${event.payload.author}`,
        timestamp: event.timestamp,
        icon: MessageSquare,
        iconClassName: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
      };

    case "execution:created":
      return {
        id,
        type: event.type,
        message: `Execution started: ${event.payload.agentName}`,
        timestamp: event.timestamp,
        icon: Play,
        iconClassName: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
      };

    case "execution:updated":
      return {
        id,
        type: event.type,
        message: `Execution ${event.payload.status}`,
        timestamp: event.timestamp,
        icon: event.payload.status === "completed" ? CheckCircle2 : Clock,
        iconClassName:
          event.payload.status === "completed"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      };

    case "routing:updated":
      return {
        id,
        type: event.type,
        message: `Routing ${event.payload.status} (iteration ${event.payload.iteration})`,
        timestamp: event.timestamp,
        icon: Clock,
        iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      };

    case "execution:log":
      // Don't show individual log lines in activity feed
      return null;

    default:
      return null;
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
