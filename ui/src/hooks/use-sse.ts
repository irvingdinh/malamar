import { useCallback, useEffect, useRef, useState } from "react";

export type SSEStatus = "connecting" | "connected" | "disconnected" | "error";

export interface SSEOptions {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEResult {
  status: SSEStatus;
  error: Error | null;
  reconnectAttempts: number;
  disconnect: () => void;
  reconnect: () => void;
}

const API_BASE = "/api";

export function useSSE(endpoint: string, options: SSEOptions = {}): SSEResult {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    enabled = true,
    reconnect: shouldReconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [status, setStatus] = useState<SSEStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isManualDisconnectRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});

  const optionsRef = useRef({
    onMessage,
    onError,
    onOpen,
    onClose,
    enabled,
    shouldReconnect,
    reconnectInterval,
    maxReconnectAttempts,
  });

  useEffect(() => {
    optionsRef.current = {
      onMessage,
      onError,
      onOpen,
      onClose,
      enabled,
      shouldReconnect,
      reconnectInterval,
      maxReconnectAttempts,
    };
  }, [
    onMessage,
    onError,
    onOpen,
    onClose,
    enabled,
    shouldReconnect,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearReconnectTimeout();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus("disconnected");
    setReconnectAttempts(0);
    optionsRef.current.onClose?.();
  }, [clearReconnectTimeout]);

  useEffect(() => {
    if (!enabled) {
      // Clean up any existing connection when disabled
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearReconnectTimeout();
      return;
    }

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setStatus("connecting");
      setError(null);

      const url = `${API_BASE}${endpoint}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStatus("connected");
        setReconnectAttempts(0);
        setError(null);
        optionsRef.current.onOpen?.();
      };

      es.onmessage = (event) => {
        optionsRef.current.onMessage?.(event);
      };

      es.onerror = (event) => {
        if (es.readyState === EventSource.CLOSED) {
          setReconnectAttempts((currentAttempts) => {
            if (
              !isManualDisconnectRef.current &&
              optionsRef.current.shouldReconnect &&
              currentAttempts < optionsRef.current.maxReconnectAttempts
            ) {
              setStatus("connecting");
              reconnectTimeoutRef.current = setTimeout(() => {
                connectRef.current();
              }, optionsRef.current.reconnectInterval);
              return currentAttempts + 1;
            } else if (
              currentAttempts >= optionsRef.current.maxReconnectAttempts
            ) {
              setError(new Error("Max reconnection attempts reached"));
              setStatus("error");
            } else {
              setStatus("disconnected");
            }
            return currentAttempts;
          });
        } else {
          setError(new Error("SSE connection error"));
          setStatus("error");
        }

        optionsRef.current.onError?.(event);
      };
    };

    connectRef.current = connect;

    isManualDisconnectRef.current = false;
    connect();

    return () => {
      isManualDisconnectRef.current = true;
      clearReconnectTimeout();

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [endpoint, enabled, clearReconnectTimeout]);

  const reconnectFn = useCallback(() => {
    isManualDisconnectRef.current = false;
    setReconnectAttempts(0);
    connectRef.current();
  }, []);

  // When disabled, always return disconnected status regardless of internal state
  const effectiveStatus = enabled ? status : "disconnected";
  const effectiveError = enabled ? error : null;

  return {
    status: effectiveStatus,
    error: effectiveError,
    reconnectAttempts: enabled ? reconnectAttempts : 0,
    disconnect,
    reconnect: reconnectFn,
  };
}
