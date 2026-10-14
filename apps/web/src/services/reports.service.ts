import { apiRequest } from "@/lib/api";

export type Activity = {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AuditLog = {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type ReportsOverview = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number;
};

export type TasksByStatus = {
  pending: number;
  inProgress: number;
  completed: number;
  canceled: number;
};

export type TasksByPriority = {
  low: number;
  medium: number;
  high: number;
  urgent: number;
};

export type ProjectPerformance = {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number;
};

export type ApprovalStatistics = {
  totalApprovals: number;
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number;
};

export type ReportDateRange = {
  from?: string;
  to?: string;
};

function buildReportQuery(
  organizationId: string,
  dateRange?: ReportDateRange,
) {
  const params = new URLSearchParams({
    organization_id: organizationId,
  });

  if (dateRange?.from) {
    params.set("from", dateRange.from);
  }

  if (dateRange?.to) {
    params.set("to", dateRange.to);
  }

  return params.toString();
}

export function getActivities(
  token: string,
  organizationId: string,
) {
  return apiRequest<Activity[]>(
    `/activities?organization_id=${organizationId}`,
    {
      token,
    },
  );
}

export function getAuditLogs(
  token: string,
  organizationId: string,
) {
  return apiRequest<AuditLog[]>(
    `/audit-logs?organization_id=${organizationId}`,
    {
      token,
    },
  );
}

export function getReportsOverview(
  token: string,
  organizationId: string,
  dateRange?: ReportDateRange,
) {
  return apiRequest<ReportsOverview>(
    `/reports/overview?${buildReportQuery(
      organizationId,
      dateRange,
    )}`,
    {
      token,
    },
  );
}

export function getTasksByStatus(
  token: string,
  organizationId: string,
  dateRange?: ReportDateRange,
) {
  return apiRequest<TasksByStatus>(
    `/reports/tasks-by-status?${buildReportQuery(
      organizationId,
      dateRange,
    )}`,
    {
      token,
    },
  );
}

export function getTasksByPriority(
  token: string,
  organizationId: string,
  dateRange?: ReportDateRange,
) {
  return apiRequest<TasksByPriority>(
    `/reports/tasks-by-priority?${buildReportQuery(
      organizationId,
      dateRange,
    )}`,
    {
      token,
    },
  );
}

export function getProjectPerformance(
  token: string,
  organizationId: string,
  dateRange?: ReportDateRange,
) {
  return apiRequest<ProjectPerformance[]>(
    `/reports/project-performance?${buildReportQuery(
      organizationId,
      dateRange,
    )}`,
    {
      token,
    },
  );
}

export function getApprovalStatistics(
  token: string,
  organizationId: string,
  dateRange?: ReportDateRange,
) {
  return apiRequest<ApprovalStatistics>(
    `/reports/approval-statistics?${buildReportQuery(
      organizationId,
      dateRange,
    )}`,
    {
      token,
    },
  );
}