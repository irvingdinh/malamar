import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface CliConfig {
  name: string;
  type: string;
  path: string | null;
  maxConcurrent?: number | null;
}

export interface ServerConfig {
  port: number;
  logLevel: string;
  logFormat: string;
}

export interface Settings {
  clis: CliConfig[];
  server: ServerConfig;
  runtimePort: number;
  runtimeClaudePath: string | null;
  runtimeMaxConcurrent: number | null;
}

export interface CliHealthStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  checkedAt: number;
}

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  version: string;
  uptime: number;
  timestamp: number;
  clis: Record<string, CliHealthStatus>;
}

interface UpdateSettingsInput {
  clis?: CliConfig[];
  server?: Partial<ServerConfig>;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Settings>("/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSettingsInput) =>
      api.put<Settings>("/settings", input),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
    },
  });
}

export function useCliHealth() {
  return useQuery({
    queryKey: ["settings", "cli", "health"],
    queryFn: () => api.get<CliHealthStatus>("/settings/cli/health"),
  });
}

export function useRefreshCliHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.get<CliHealthStatus>("/settings/cli/health"),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings", "cli", "health"], data);
    },
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<HealthStatus>("/health"),
    refetchInterval: 30000,
  });
}
