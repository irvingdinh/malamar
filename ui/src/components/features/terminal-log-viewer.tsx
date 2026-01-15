import "xterm/css/xterm.css";

import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

import { Button } from "@/components/ui/button";
import { useExecutionLogStream } from "@/hooks/use-execution-logs";
import { cn } from "@/lib/utils";

export interface TerminalLogViewerRef {
  clear: () => void;
}

export interface TerminalLogViewerProps {
  logs?: string[];
  className?: string;
  autoScroll?: boolean;
  fontSize?: number;
  terminalRef?: React.RefObject<TerminalLogViewerRef | null>;
}

export function TerminalLogViewer({
  logs = [],
  className,
  autoScroll = true,
  fontSize = 13,
  terminalRef: externalRef,
}: TerminalLogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isInitializedRef = useRef(false);
  const lastLogIndexRef = useRef(-1);

  // Expose clear method via ref
  useImperativeHandle(
    externalRef,
    () => ({
      clear: () => {
        if (terminalRef.current) {
          terminalRef.current.clear();
          lastLogIndexRef.current = -1;
        }
      },
    }),
    [],
  );

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: "#1a1a1a",
        foreground: "#e5e5e5",
        cursor: "#e5e5e5",
        cursorAccent: "#1a1a1a",
        selectionBackground: "#3b82f680",
        black: "#1a1a1a",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e5e5e5",
        brightBlack: "#737373",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.2,
      cursorBlink: false,
      cursorStyle: "bar",
      scrollback: 10000,
      convertEol: true,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);

    // Fit after a small delay to ensure the container is properly sized
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors during initialization
      }
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    isInitializedRef.current = true;

    return () => {
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      isInitializedRef.current = false;
      // Reset log index so new terminal gets all logs
      lastLogIndexRef.current = -1;
    };
  }, [fontSize]);

  // Handle resize
  useEffect(() => {
    if (!fitAddonRef.current || !isInitializedRef.current) return;

    const handleResize = () => {
      try {
        fitAddonRef.current?.fit();
      } catch {
        // Ignore fit errors
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Write logs to terminal
  useEffect(() => {
    if (!terminalRef.current || !isInitializedRef.current) return;

    const terminal = terminalRef.current;

    // Write only new logs
    for (let i = lastLogIndexRef.current + 1; i < logs.length; i++) {
      const log = logs[i];
      terminal.write(log);

      // Add newline if the log doesn't end with one
      if (!log.endsWith("\n") && !log.endsWith("\r\n")) {
        terminal.write("\r\n");
      }
    }

    lastLogIndexRef.current = logs.length - 1;

    // Auto-scroll to bottom
    if (autoScroll) {
      terminal.scrollToBottom();
    }
  }, [logs, autoScroll]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-[200px] overflow-hidden rounded-md bg-[#1a1a1a]",
        className,
      )}
    />
  );
}

export interface StreamingTerminalProps {
  executionId: string;
  className?: string;
  autoScroll?: boolean;
  fontSize?: number;
  onComplete?: (status: string, result?: string) => void;
}

export function StreamingTerminal({
  executionId,
  className,
  autoScroll = true,
  fontSize = 13,
  onComplete,
}: StreamingTerminalProps) {
  const terminalRef = useRef<TerminalLogViewerRef | null>(null);

  const handleReconnect = useCallback(() => {
    // Clear terminal when reconnecting to avoid duplicate logs
    terminalRef.current?.clear();
  }, []);

  const { logs, status, error, reconnect, reconnectAttempts } =
    useExecutionLogStream(executionId, {
      onComplete,
      onReconnect: handleReconnect,
    });

  return (
    <div className="flex flex-col gap-2">
      {status === "connecting" && reconnectAttempts === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-2 animate-pulse rounded-full bg-yellow-500" />
          Connecting to log stream...
        </div>
      )}
      {status === "connecting" && reconnectAttempts > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-2 animate-pulse rounded-full bg-yellow-500" />
          {error}
        </div>
      )}
      {status === "connected" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-2 animate-pulse rounded-full bg-green-500" />
          Streaming logs...
        </div>
      )}
      {status === "completed" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="size-2 rounded-full bg-blue-500" />
          Execution completed
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <div className="size-2 rounded-full bg-red-500" />
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={reconnect}
            className="ml-2 h-auto p-0"
          >
            Reconnect
          </Button>
        </div>
      )}
      <TerminalLogViewer
        logs={logs}
        className={className}
        autoScroll={autoScroll}
        fontSize={fontSize}
        terminalRef={terminalRef}
      />
    </div>
  );
}
