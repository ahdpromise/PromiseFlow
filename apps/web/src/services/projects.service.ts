import { apiRequest } from "@/lib/api";

import type { Project } from "@/types/dashboard";

export type CreateProjectPayload = {
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
};

export type UpdateProjectPayload = {
  name: string;
  slug: string;
  description?: string;
};

export function getProjects(
  token: string,
  organizationId: string,
) {
  return apiRequest<Project[]>(
    `/projects?organization_id=${encodeURIComponent(
      organizationId,
    )}`,
    {
      token,
    },
  );
}

export function createProject(
  token: string,
  payload: CreateProjectPayload,
) {
  return apiRequest<Project>(
    "/projects",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function updateProject(
  token: string,
  projectId: string,
  payload: UpdateProjectPayload,
) {
  return apiRequest<Project>(
    `/projects/${encodeURIComponent(
      projectId,
    )}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function deleteProject(
  token: string,
  projectId: string,
) {
  return apiRequest<Project>(
    `/projects/${encodeURIComponent(
      projectId,
    )}`,
    {
      method: "DELETE",
      token,
    },
  );
}