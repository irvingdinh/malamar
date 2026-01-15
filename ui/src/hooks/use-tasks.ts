import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: string;
  taskId: string;
  author: string;
  authorType: "human" | "agent" | "system";
  content: string;
  log: string | null;
  createdAt: number;
}

export interface Attachment {
  id: string;
  taskId: string;
  filename: string;
  storedName: string;
  mimeType: string | null;
  size: number;
  createdAt: number;
}

export interface TaskDetail extends Task {
  comments?: Comment[];
  attachments?: Attachment[];
}

interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseTasksOptions {
  status?: TaskStatus;
  page?: number;
  limit?: number;
}

interface CreateTaskInput {
  title?: string;
  description?: string;
}

interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
}

interface AddCommentInput {
  author?: string;
  authorType?: "human" | "agent" | "system";
  content?: string;
}

export function useTasks(
  workspaceId: string | undefined,
  options: UseTasksOptions = {},
) {
  const { status, page = 1, limit = 50 } = options;

  return useQuery({
    queryKey: ["workspace", workspaceId, "tasks", { status, page, limit }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (status) {
        params.set("status", status);
      }
      return api.get<TasksResponse>(
        `/workspaces/${workspaceId}/tasks?${params.toString()}`,
      );
    },
    enabled: !!workspaceId,
  });
}

export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => api.get<TaskDetail>(`/tasks/${taskId}`),
    enabled: !!taskId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      ...input
    }: CreateTaskInput & { workspaceId: string }) =>
      api.post<Task>(`/workspaces/${workspaceId}/tasks`, input),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "tasks"],
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, ...input }: UpdateTaskInput & { taskId: string }) =>
      api.put<Task>(`/tasks/${taskId}`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", data.workspaceId, "tasks"],
      });
      queryClient.setQueryData(["task", data.id], (old: TaskDetail | undefined) =>
        old ? { ...old, ...data } : data,
      );
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { taskId: string; workspaceId: string }) =>
      api.delete<void>(`/tasks/${variables.taskId}`),
    onSuccess: (_, { taskId, workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "tasks"],
      });
      queryClient.removeQueries({ queryKey: ["task", taskId] });
    },
  });
}

export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      api.post<Task>(`/tasks/${taskId}/cancel`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", data.workspaceId, "tasks"],
      });
      queryClient.setQueryData(["task", data.id], (old: TaskDetail | undefined) =>
        old ? { ...old, ...data } : data,
      );
    },
  });
}

export function useRestartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string }) =>
      api.post<Task>(`/tasks/${taskId}/restart`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", data.workspaceId, "tasks"],
      });
      queryClient.setQueryData(["task", data.id], (old: TaskDetail | undefined) =>
        old ? { ...old, ...data } : data,
      );
    },
  });
}

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task", taskId, "comments"],
    queryFn: () => api.get<Comment[]>(`/tasks/${taskId}/comments`),
    enabled: !!taskId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, ...input }: AddCommentInput & { taskId: string }) =>
      api.post<Comment>(`/tasks/${taskId}/comments`, input),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });
}

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task", taskId, "attachments"],
    queryFn: () => api.get<Attachment[]>(`/tasks/${taskId}/attachments`),
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      api.upload<Attachment>(`/tasks/${taskId}/attachments`, file),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ["task", taskId, "attachments"],
      });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { attachmentId: string; taskId: string }) =>
      api.delete<void>(`/attachments/${variables.attachmentId}`),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({
        queryKey: ["task", taskId, "attachments"],
      });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });
}
