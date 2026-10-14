import { apiRequest } from "@/lib/api";

import type {
  Approval,
  Organization,
  Project,
  Task,
  Team,
} from "@/types/dashboard";

export type DashboardData = {
  organization: Organization;
  projects: Project[];
  tasks: Task[];
  teams: Team[];
  approvals: Approval[];
};

export function getOrganizations(
  token: string,
) {
  return apiRequest<Organization[]>(
    "/organizations",
    {
      token,
    },
  );
}

export function getDashboardData(
  token: string,
  organizationId: string,
) {
  return apiRequest<DashboardData>(
    `/dashboard?organization_id=${encodeURIComponent(
      organizationId,
    )}`,
    {
      token,
    },
  );
}