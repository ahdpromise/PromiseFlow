import { apiRequest } from "@/lib/api";

export type Workflow = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateWorkflowPayload = {
  project_id: string;
  name: string;
  slug: string;
  description?: string;
};

export type UpdateWorkflowPayload = {
  name?: string;
  slug?: string;
  description?: string | null;
};

export function getWorkflows(
  token: string,
  projectId: string,
) {
  return apiRequest<Workflow[]>(
    `/workflows?project_id=${projectId}`,
    {
      token,
    },
  );
}

export function createWorkflow(
  token: string,
  payload: CreateWorkflowPayload,
) {
  return apiRequest<Workflow>(
    "/workflows",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function updateWorkflow(
  token: string,
  workflowId: string,
  payload: UpdateWorkflowPayload,
) {
  return apiRequest<Workflow>(
    `/workflows/${workflowId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function deleteWorkflow(
  token: string,
  workflowId: string,
) {
  return apiRequest<{
    success: boolean;
  }>(
    `/workflows/${workflowId}`,
    {
      method: "DELETE",
      token,
    },
  );
}