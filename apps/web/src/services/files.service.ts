import { API_BASE_URL, apiRequest } from "@/lib/api";

export type TaskFile = {
  id: string;
  task_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by_user_id: string;
  created_at: string;
};

export function getFiles(
  token: string,
  taskId: string,
) {
  return apiRequest<TaskFile[]>(
    `/files?task_id=${encodeURIComponent(taskId)}`,
    {
      token,
    },
  );
}

export async function uploadFile(
  token: string,
  taskId: string,
  file: File,
): Promise<TaskFile> {
  const formData = new FormData();

  formData.append("task_id", taskId);
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/files/upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(
      `File upload failed (${response.status})`,
    );
  }

  return response.json() as Promise<TaskFile>;
}