import { apiRequest } from "@/lib/api";

import type { Team } from "@/types/dashboard";

export type CreateTeamPayload = {
  organization_id: string;
  name: string;
  slug: string;
};

export type UpdateTeamPayload = {
  name?: string;
  slug?: string;
  description?: string | null;
};

export type DeleteTeamResponse = {
  id: string;
  deleted: boolean;
};

export function getTeams(
  token: string,
  organizationId: string,
) {
  return apiRequest<Team[]>(
    `/teams?organization_id=${organizationId}`,
    {
      token,
    },
  );
}

export function createTeam(
  token: string,
  payload: CreateTeamPayload,
) {
  return apiRequest<Team>(
    "/teams",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function updateTeam(
  token: string,
  teamId: string,
  payload: UpdateTeamPayload,
) {
  return apiRequest<Team>(
    `/teams/${teamId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function deleteTeam(
  token: string,
  teamId: string,
) {
  return apiRequest<DeleteTeamResponse>(
    `/teams/${teamId}`,
    {
      method: "DELETE",
      token,
    },
  );
}