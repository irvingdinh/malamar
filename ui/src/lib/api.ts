const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.error?.message || `HTTP ${response.status}`,
      response.status,
      error.error?.code,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint),

  post: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    fetchApi<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, {
      method: "DELETE",
    }),

  upload: async <T>(endpoint: string, file: File): Promise<T> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.error?.message || `HTTP ${response.status}`,
        response.status,
        error.error?.code,
      );
    }

    return response.json();
  },
};
