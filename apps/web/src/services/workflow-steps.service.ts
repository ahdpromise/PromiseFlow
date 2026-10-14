import { apiRequest } from "@/lib/api";

export type WorkflowStep = {
  id: string;
  workflow_id: string;
  name: string;
  slug: string;
  description: string | null;
  step_type: string;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateWorkflowStepPayload = {
  workflow_id: string;
  name: string;
  slug: string;
  step_type: string;
  position: number;
  description?: string;
};

export type UpdateWorkflowStepPayload = {
  name?: string;
  slug?: string;
  description?: string | null;
  step_type?: string;
};

export type ReorderWorkflowStepsPayload = {
  workflow_id: string;
  step_ids: string[];
};

export function getWorkflowSteps(
  token: string,
  workflowId: string,
) {
  return apiRequest<WorkflowStep[]>(
    `/workflow-steps?workflow_id=${workflowId}`,
    {
      token,
    },
  );
}

export function createWorkflowStep(
  token: string,
  payload: CreateWorkflowStepPayload,
) {
  return apiRequest<WorkflowStep>(
    "/workflow-steps",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function updateWorkflowStep(
  token: string,
  workflowStepId: string,
  payload: UpdateWorkflowStepPayload,
) {
  return apiRequest<WorkflowStep>(
    `/workflow-steps/${workflowStepId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function deleteWorkflowStep(
  token: string,
  workflowStepId: string,
) {
  return apiRequest<{
    success: boolean;
  }>(
    `/workflow-steps/${workflowStepId}`,
    {
      method: "DELETE",
      token,
    },
  );
}

export function reorderWorkflowSteps(
  token: string,
  payload: ReorderWorkflowStepsPayload,
) {
  return apiRequest<WorkflowStep[]>(
    "/workflow-steps/reorder",
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}