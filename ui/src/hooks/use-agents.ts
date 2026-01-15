import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export interface Agent {
  id: string;
  workspaceId: string;
  name: string;
  roleInstruction: string | null;
  workingInstruction: string | null;
  order: number;
  timeoutMinutes: number | null;
  createdAt: number;
  updatedAt: number;
}

interface CreateAgentInput {
  name?: string;
  roleInstruction?: string;
  workingInstruction?: string;
  timeoutMinutes?: number;
}

interface UpdateAgentInput {
  name?: string;
  roleInstruction?: string | null;
  workingInstruction?: string | null;
  timeoutMinutes?: number | null;
}

export function useAgents(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace", workspaceId, "agents"],
    queryFn: () => api.get<Agent[]>(`/workspaces/${workspaceId}/agents`),
    enabled: !!workspaceId,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      ...input
    }: CreateAgentInput & { workspaceId: string }) =>
      api.post<Agent>(`/workspaces/${workspaceId}/agents`, input),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "agents"],
      });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      agentId,
      ...input
    }: UpdateAgentInput & { workspaceId: string; agentId: string }) =>
      api.put<Agent>(`/workspaces/${workspaceId}/agents/${agentId}`, input),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "agents"],
      });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      agentId,
    }: {
      workspaceId: string;
      agentId: string;
    }) => api.delete<void>(`/workspaces/${workspaceId}/agents/${agentId}`),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "agents"],
      });
    },
  });
}

export function useReorderAgents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      orderedIds,
    }: {
      workspaceId: string;
      orderedIds: string[];
    }) =>
      api.put<Agent[]>(`/workspaces/${workspaceId}/agents/reorder`, {
        orderedIds,
      }),
    onSuccess: (data, { workspaceId }) => {
      queryClient.setQueryData(["workspace", workspaceId, "agents"], data);
    },
  });
}
