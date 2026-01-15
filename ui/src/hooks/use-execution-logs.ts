import { useCallback, useEffect, useRef, useState } from "react";

export type StreamStatus = "connecting" | "connected" | "completed" | "error";

interface StreamState {
  logs: string[];
  status: StreamStatus;
  error: string | null;
  reconnectAttempts: number;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

export interface UseExecutionLogStreamResult extends StreamState {
  reconnect: () => void;
}

export interface UseExecutionLogStreamOptions {
  onComplete?: (status: string, result?: string) => void;
  onReconnect?: () => void;
  enabled?: boolean;
}

/**
 * Hook for streaming execution logs via SSE.
 *
 * Connects to `/api/events/executions/:id/logs` and streams logs in real-time.
 * Includes automatic reconnection with configurable attempts.
 */
export function useExecutionLogStream(
  executionId: string | undefined,
  options: UseExecutionLogStreamOptions = {},
): UseExecutionLogStreamResult {
  const { onComplete, onReconnect, enabled = true } = options;

  const [state, setState] = useState<StreamState>({
    logs: [],
    status: "connecting",
    error: null,
    reconnectAttempts: 0,
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onReconnectRef = useRef(onReconnect);
  const connectRef = useRef<() => void>(() => {});
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onReconnectRef.current = onReconnect;
  }, [onComplete, onReconnect]);

  // Cleanup reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Connect to SSE log stream
  useEffect(() => {
    if (!executionId || !enabled) return;

    const connect = (isReconnect = false) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearReconnectTimeout();

      if (isReconnect) {
        // Clear terminal on reconnect to avoid duplicates
        onReconnectRef.current?.();
        setState((prev) => ({
          logs: [],
          status: "connecting",
          error: null,
          reconnectAttempts: prev.reconnectAttempts,
        }));
      } else {
        setState({
          logs: [],
          status: "connecting",
          error: null,
          reconnectAttempts: 0,
        });
      }

      const url = `/api/events/executions/${executionId}/logs`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setState((prev) => ({
          ...prev,
          status: "connected",
          reconnectAttempts: 0,
        }));
      };

      eventSource.addEventListener("log", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as { content: string };
          setState((prev) => ({ ...prev, logs: [...prev.logs, data.content] }));
        } catch {
          // Ignore parsing errors
        }
      });

      eventSource.addEventListener("complete", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as {
            status: string;
            result?: string;
          };
          setState((prev) => ({ ...prev, status: "completed" }));
          onCompleteRef.current?.(data.status, data.result);
          eventSource.close();
        } catch {
          // Ignore parsing errors
        }
      });

      eventSource.addEventListener("keepalive", () => {
        // Keepalive received, connection is alive
      });

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          setState((prev) => {
            // Only attempt reconnect if not completed
            if (prev.status === "completed") {
              return prev;
            }

            // Check if we should auto-reconnect
            if (prev.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              // Schedule reconnect
              reconnectTimeoutRef.current = setTimeout(() => {
                connect(true);
              }, RECONNECT_INTERVAL);

              return {
                ...prev,
                status: "connecting",
                error: `Reconnecting... (attempt ${prev.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`,
                reconnectAttempts: prev.reconnectAttempts + 1,
              };
            }

            return {
              ...prev,
              status: "error",
              error: "Connection lost. Max reconnection attempts reached.",
            };
          });
        }
      };
    };

    connectRef.current = () => connect(true);
    connect(false);

    return () => {
      clearReconnectTimeout();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [executionId, enabled, clearReconnectTimeout]);

  const reconnect = useCallback(() => {
    // Reset reconnect attempts for manual reconnect
    setState((prev) => ({ ...prev, reconnectAttempts: 0 }));
    connectRef.current();
  }, []);

  return {
    ...state,
    reconnect,
  };
}
