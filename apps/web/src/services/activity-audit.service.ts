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

export type ActivityAuditFilters = {
  action?: string;
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

function buildParams(
  organizationId: string,
  filters: ActivityAuditFilters,
) {
  const params = new URLSearchParams({
    organization_id: organizationId,
  });

  if (filters.action) {
    params.set("action", filters.action);
  }

  if (filters.userId) {
    params.set("user_id", filters.userId);
  }

  if (filters.entityType) {
    params.set(
      "entity_type",
      filters.entityType,
    );
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.page !== undefined) {
    params.set("page", String(filters.page));
  }

  if (filters.limit !== undefined) {
    params.set("limit", String(filters.limit));
  }

  return params.toString();
}

export function getActivities(
  token: string,
  organizationId: string,
  filters: ActivityAuditFilters = {},
) {
  return apiRequest<PaginatedResponse<Activity>>(
    `/activities?${buildParams(
      organizationId,
      filters,
    )}`,
    {
      token,
    },
  );
}

export function getAuditLogs(
  token: string,
  organizationId: string,
  filters: ActivityAuditFilters = {},
) {
  return apiRequest<PaginatedResponse<AuditLog>>(
    `/audit-logs?${buildParams(
      organizationId,
      filters,
    )}`,
    {
      token,
    },
  );
}