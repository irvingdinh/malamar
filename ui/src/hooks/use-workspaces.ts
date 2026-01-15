import { useQuery } from "@tanstack/react-query";

import { fetchApi } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: Record<string, unknown>;
}

interface WorkspacesResponse {
  data: Workspace[];
  total: number;
}

interface UseWorkspacesOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useWorkspaces({
  search,
  page = 1,
  pageSize = 10,
}: UseWorkspacesOptions = {}) {
  return useQuery({
    queryKey: ["workspaces", { search, page, pageSize }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String((page - 1) * pageSize));
      if (search) {
        params.set("q", search);
      }
      return fetchApi<WorkspacesResponse>(`/workspaces?${params.toString()}`);
    },
  });
}
