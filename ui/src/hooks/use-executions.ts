import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";
export type ExecutionResult = "skip" | "comment" | "error" | null;

export interface Execution {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  cliType: string;
  status: ExecutionStatus;
  result: ExecutionResult;
  output: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  content: string;
  timestamp: number;
}

export interface ExecutionDetail extends Execution {
  logs?: ExecutionLog[];
}

interface ExecutionsResponse {
  executions: Execution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseExecutionsOptions {
  taskId?: string;
  status?: ExecutionStatus;
  page?: number;
  limit?: number;
}

export interface AgentAnalytics {
  agentId: string;
  agentName: string;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgDurationMs: number | null;
}

export function useExecutions(options: UseExecutionsOptions = {}) {
  const { taskId, status, page = 1, limit = 50 } = options;

  return useQuery({
    queryKey: ["executions", { taskId, status, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (taskId) {
        params.set("taskId", taskId);
      }
      if (status) {
        params.set("status", status);
      }
      return api.get<ExecutionsResponse>(`/executions?${params.toString()}`);
    },
  });
}

export function useExecution(
  executionId: string | undefined,
  options: { includeLogs?: boolean } = {},
) {
  const { includeLogs = false } = options;

  return useQuery({
    queryKey: ["execution", executionId, { includeLogs }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (includeLogs) {
        params.set("includeLogs", "true");
      }
      const queryString = params.toString();
      return api.get<ExecutionDetail>(
        `/executions/${executionId}${queryString ? `?${queryString}` : ""}`,
      );
    },
    enabled: !!executionId,
  });
}

export function useExecutionLogs(executionId: string | undefined) {
  return useQuery({
    queryKey: ["execution", executionId, "logs"],
    queryFn: () => api.get<ExecutionLog[]>(`/executions/${executionId}/logs`),
    enabled: !!executionId,
  });
}

export function useExecutionAnalytics() {
  return useQuery({
    queryKey: ["executions", "analytics"],
    queryFn: () => api.get<AgentAnalytics[]>("/executions/analytics"),
  });
}
