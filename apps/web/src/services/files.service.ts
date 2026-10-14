import { apiRequest } from "@/lib/api";

export type TaskFile = {
  id: string;
  task_id: string;
  uploaded_by_user_id: string;
  file_name: string;
  storage_key: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  deleted_at: string | null;
};

export function getFiles(
  token: string,
  taskId: string,
) {
  return apiRequest<TaskFile[]>(
    `/files?task_id=${taskId}`,
    {
      token,
    },
  );
}

export async function uploadFile(
  token: string,
  taskId: string,
  file: File,
) {
  const formData = new FormData();

  formData.append(
    "task_id",
    taskId,
  );

  formData.append(
    "file",
    file,
  );

  const response = await fetch(
    "http://localhost:3001/files/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const message =
      await response.text();

    throw new Error(
      message ||
        "Unable to upload file",
    );
  }

  return response.json() as Promise<TaskFile>;
}