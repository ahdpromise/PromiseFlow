import { apiRequest } from "@/lib/api";

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateCommentPayload = {
  task_id: string;
  content: string;
};

export function getComments(
  token: string,
  taskId: string,
) {
  return apiRequest<Comment[]>(
    `/comments?task_id=${taskId}`,
    {
      token,
    },
  );
}

export function createComment(
  token: string,
  payload: CreateCommentPayload,
) {
  return apiRequest<Comment>(
    "/comments",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}