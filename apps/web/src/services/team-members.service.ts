import { apiRequest } from "@/lib/api";

export type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DeleteTeamMemberResponse = {
  id: string;
  deleted: boolean;
};

export function getTeamMembers(
  token: string,
  teamId: string,
) {
  return apiRequest<TeamMember[]>(
    `/team-members?team_id=${teamId}`,
    {
      token,
    },
  );
}

export function createTeamMember(
  token: string,
  teamId: string,
  userId: string,
) {
  return apiRequest<TeamMember>(
    "/team-members",
    {
      method: "POST",
      token,
      body: JSON.stringify({
        team_id: teamId,
        user_id: userId,
      }),
    },
  );
}

export function deleteTeamMember(
  token: string,
  teamMemberId: string,
) {
  return apiRequest<DeleteTeamMemberResponse>(
    `/team-members/${teamMemberId}`,
    {
      method: "DELETE",
      token,
    },
  );
}