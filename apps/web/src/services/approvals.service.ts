import { apiRequest } from "@/lib/api";

import type { Approval } from "@/types/dashboard";

export type ApprovalUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type ApprovalProject = {
  id: string;
  name: string;
};

export type ApprovalTask = {
  id: string;
  title: string;
  project_id: string;
  project: ApprovalProject;
};

export type ApprovalDetailsTask =
  ApprovalTask & {
    description: string | null;
    status: string;
    priority: string;
    due_at: string | null;
  };

export type ApprovalListItem = Approval & {
  requested_by_user_id: string;
  decision_comment: string | null;
  task: ApprovalTask;
  approver_user: ApprovalUser;
  requested_by_user: ApprovalUser;
};

export type ApprovalDetails =
  Approval & {
    requested_by_user_id: string;
    decision_comment: string | null;
    task: ApprovalDetailsTask;
    approver_user: ApprovalUser;
    requested_by_user: ApprovalUser;
  };

export type CreateApprovalPayload = {
  task_id: string;
  approver_user_id: string;
  comment?: string;
};

export type ApprovalDecisionPayload = {
  status: "approved" | "rejected";
  decision_comment?: string;
};

export type ApprovalFilters = {
  taskId?: string;
  status?:
    | "pending"
    | "approved"
    | "rejected";
  projectId?: string;
};

export function getApprovals(
  token: string,
  filtersOrTaskId:
    | ApprovalFilters
    | string = {},
) {
  const filters: ApprovalFilters =
    typeof filtersOrTaskId === "string"
      ? {
          taskId: filtersOrTaskId,
        }
      : filtersOrTaskId;

  const searchParams =
    new URLSearchParams();

  if (filters.taskId) {
    searchParams.set(
      "task_id",
      filters.taskId,
    );
  }

  if (filters.status) {
    searchParams.set(
      "status",
      filters.status,
    );
  }

  if (filters.projectId) {
    searchParams.set(
      "project_id",
      filters.projectId,
    );
  }

  const query =
    searchParams.toString();

  return apiRequest<ApprovalListItem[]>(
    `/approvals${
      query ? `?${query}` : ""
    }`,
    {
      token,
    },
  );
}

export function getApproval(
  token: string,
  approvalId: string,
) {
  return apiRequest<ApprovalDetails>(
    `/approvals/${approvalId}`,
    {
      token,
    },
  );
}

export function createApproval(
  token: string,
  payload: CreateApprovalPayload,
) {
  return apiRequest<Approval>(
    "/approvals",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function decideApproval(
  token: string,
  approvalId: string,
  payload: ApprovalDecisionPayload,
) {
  return apiRequest<Approval>(
    `/approvals/${approvalId}/decision`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}