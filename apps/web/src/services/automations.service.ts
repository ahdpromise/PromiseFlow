import { apiRequest } from "@/lib/api";

export type AutomationCreator = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type AutomationListItem = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_enabled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator: AutomationCreator | null;
};

export type AutomationRunStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed";

export type AutomationRun = {
  id: string;
  automation_id: string;
  organization_id: string;
  status: AutomationRunStatus;
  trigger_payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

export type AutomationTriggerType =
  | "task_created"
  | "task_status_changed"
  | "approval_approved"
  | "approval_rejected";

export type AutomationActionType =
  | "create_notification"
  | "update_task_status"
  | "create_approval_request";

export type AutomationTriggerConfig = {
  project_id?: string;
  status?: string;
};

export type AutomationActionConfig = {
  title?: string;
  message?: string;
  status?: string;
  approver_id?: string;
};

export type CreateAutomationPayload = {
  organization_id: string;
  name: string;
  description?: string;
  trigger_type: AutomationTriggerType;
  trigger_config?: AutomationTriggerConfig;
  action_type: AutomationActionType;
  action_config?: AutomationActionConfig;
};

export type UpdateAutomationPayload = {
  name: string;
  description?: string;
  trigger_type: AutomationTriggerType;
  trigger_config?: AutomationTriggerConfig;
  action_type: AutomationActionType;
  action_config?: AutomationActionConfig;
};

export function getAutomations(
  token: string,
  organizationId: string,
) {
  return apiRequest<AutomationListItem[]>(
    `/automations?organization_id=${encodeURIComponent(
      organizationId,
    )}`,
    {
      token,
    },
  );
}

export function getAutomationRuns(
  token: string,
  automationId: string,
) {
  return apiRequest<AutomationRun[]>(
    `/automations/${automationId}/runs`,
    {
      token,
    },
  );
}

export function createAutomation(
  token: string,
  payload: CreateAutomationPayload,
) {
  return apiRequest<AutomationListItem>(
    "/automations",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function updateAutomation(
  token: string,
  automationId: string,
  payload: UpdateAutomationPayload,
) {
  return apiRequest<AutomationListItem>(
    `/automations/${automationId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function setAutomationEnabled(
  token: string,
  automationId: string,
  isEnabled: boolean,
) {
  return apiRequest<AutomationListItem>(
    `/automations/${automationId}/enabled`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        is_enabled: isEnabled,
      }),
    },
  );
}

export function deleteAutomation(
  token: string,
  automationId: string,
) {
  return apiRequest<{
    success: boolean;
  }>(
    `/automations/${automationId}`,
    {
      method: "DELETE",
      token,
    },
  );
}