import { apiRequest } from "@/lib/api";

import type { Task } from "@/types/dashboard";

export type CreateTaskPayload = {
  project_id: string;
  title: string;
  description?: string;
  workflow_step_id?: string;
  assigned_to_user_id?: string;
  status?: string;
  priority?: string;
  due_at?: string;
};

export type UpdateTaskPayload = {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  due_at?: string | null;
};

export type DeleteTaskResponse = {
  id: string;
  deleted: boolean;
};

export function getTasks(
  token: string,
  projectId: string,
) {
  return apiRequest<Task[]>(
    `/tasks?project_id=${projectId}`,
    {
      token,
    },
  );
}

export function getTask(
  token: string,
  taskId: string,
) {
  return apiRequest<Task>(
    `/tasks/${taskId}`,
    {
      token,
    },
  );
}

export function createTask(
  token: string,
  payload: CreateTaskPayload,
) {
  return apiRequest<Task>(
    "/tasks",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function updateTask(
  token: string,
  taskId: string,
  payload: UpdateTaskPayload,
) {
  return apiRequest<Task>(
    `/tasks/${taskId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function deleteTask(
  token: string,
  taskId: string,
) {
  return apiRequest<DeleteTaskResponse>(
    `/tasks/${taskId}`,
    {
      method: "DELETE",
      token,
    },
  );
}