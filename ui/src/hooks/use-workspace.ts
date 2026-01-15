import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface Workspace {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

interface CreateWorkspaceInput {
  name?: string;
}

interface UpdateWorkspaceInput {
  name?: string;
}

interface SetWorkspaceSettingInput {
  key: string;
  value: unknown;
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: () => api.get<Workspace>(`/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) =>
      api.post<Workspace>("/workspaces", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateWorkspaceInput & { id: string }) =>
      api.put<Workspace>(`/workspaces/${id}`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.setQueryData(["workspace", data.id], data);
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) =>
      api.delete<void>(`/workspaces/${id}${force ? "?force=true" : ""}`),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.removeQueries({ queryKey: ["workspace", id] });
    },
  });
}

export function useWorkspaceSettings(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace", workspaceId, "settings"],
    queryFn: () =>
      api.get<Record<string, unknown>>(`/workspaces/${workspaceId}/settings`),
    enabled: !!workspaceId,
  });
}

export function useSetWorkspaceSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      key,
      value,
    }: SetWorkspaceSettingInput & { workspaceId: string }) =>
      api.put<{ key: string; value: unknown }>(
        `/workspaces/${workspaceId}/settings/${key}`,
        { value },
      ),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "settings"],
      });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
  });
}

export function useDeleteWorkspaceSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      key,
    }: {
      workspaceId: string;
      key: string;
    }) => api.delete<void>(`/workspaces/${workspaceId}/settings/${key}`),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "settings"],
      });
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
    },
  });
}
