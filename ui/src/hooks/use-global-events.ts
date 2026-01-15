import { useCallback, useEffect, useRef } from "react";

import { type SSEStatus, useSSE } from "./use-sse";

export type EventType =
  | "task:created"
  | "task:updated"
  | "task:deleted"
  | "task:comment:added"
  | "execution:created"
  | "execution:updated"
  | "execution:log"
  | "routing:updated";

export interface TaskCreatedPayload {
  id: string;
  workspaceId: string;
  name: string;
  status: string;
}

export interface TaskUpdatedPayload {
  id: string;
  workspaceId: string;
  changes: Record<string, unknown>;
}

export interface TaskDeletedPayload {
  id: string;
  workspaceId: string;
}

export interface TaskCommentAddedPayload {
  taskId: string;
  commentId: string;
  author: string;
  authorType: "human" | "agent";
}

export interface ExecutionCreatedPayload {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  status: string;
}

export interface ExecutionUpdatedPayload {
  id: string;
  taskId: string;
  status: string;
  result?: string;
}

export interface ExecutionLogPayload {
  executionId: string;
  content: string;
  timestamp: number;
}

export interface RoutingUpdatedPayload {
  taskId: string;
  status: string;
  currentAgentIndex: number;
  iteration: number;
}

export type EventPayload =
  | TaskCreatedPayload
  | TaskUpdatedPayload
  | TaskDeletedPayload
  | TaskCommentAddedPayload
  | ExecutionCreatedPayload
  | ExecutionUpdatedPayload
  | ExecutionLogPayload
  | RoutingUpdatedPayload;

export interface BaseEvent<T extends EventType = EventType, P = EventPayload> {
  type: T;
  payload: P;
  timestamp: number;
}

export type AppEvent =
  | BaseEvent<"task:created", TaskCreatedPayload>
  | BaseEvent<"task:updated", TaskUpdatedPayload>
  | BaseEvent<"task:deleted", TaskDeletedPayload>
  | BaseEvent<"task:comment:added", TaskCommentAddedPayload>
  | BaseEvent<"execution:created", ExecutionCreatedPayload>
  | BaseEvent<"execution:updated", ExecutionUpdatedPayload>
  | BaseEvent<"execution:log", ExecutionLogPayload>
  | BaseEvent<"routing:updated", RoutingUpdatedPayload>;

type EventHandler<T extends EventType> = (
  event: Extract<AppEvent, { type: T }>,
) => void;

type EventHandlers = {
  [K in EventType]?: EventHandler<K>;
};

export interface UseGlobalEventsOptions {
  handlers?: EventHandlers;
  onAnyEvent?: (event: AppEvent) => void;
  enabled?: boolean;
}

export interface UseGlobalEventsResult {
  status: SSEStatus;
  error: Error | null;
  disconnect: () => void;
  reconnect: () => void;
}

export function useGlobalEvents(
  options: UseGlobalEventsOptions = {},
): UseGlobalEventsResult {
  const { handlers, onAnyEvent, enabled = true } = options;

  const handlersRef = useRef(handlers);
  const onAnyEventRef = useRef(onAnyEvent);

  useEffect(() => {
    handlersRef.current = handlers;
    onAnyEventRef.current = onAnyEvent;
  }, [handlers, onAnyEvent]);

  const handleMessage = useCallback((messageEvent: MessageEvent) => {
    try {
      const event = JSON.parse(messageEvent.data) as AppEvent;

      onAnyEventRef.current?.(event);

      const handler = handlersRef.current?.[event.type];
      if (handler) {
        // @ts-expect-error - TypeScript can't infer the correct handler type
        handler(event);
      }
    } catch {
      // Ignore invalid JSON (e.g., keepalive pings)
    }
  }, []);

  const { status, error, disconnect, reconnect } = useSSE("/events", {
    onMessage: handleMessage,
    enabled,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  return {
    status,
    error,
    disconnect,
    reconnect,
  };
}
