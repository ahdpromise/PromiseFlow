import { apiRequest } from "@/lib/api";

export type Invitation = {
  id: string;
  organization_id: string;
  email: string;
  role_id: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type InvitationRole = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreateInvitationPayload = {
  organization_id: string;
  email: string;
  role_id: string;
  expires_at: string;
};

export type AcceptInvitationResponse = {
  membership_id: string;
  organization_id: string;
};

export function getInvitations(
  token: string,
  organizationId: string,
) {
  return apiRequest<Invitation[]>(
    `/invitations?organization_id=${encodeURIComponent(
      organizationId,
    )}`,
    {
      token,
    },
  );
}

export function getInvitationRoles(
  token: string,
  organizationId: string,
) {
  return apiRequest<InvitationRole[]>(
    `/roles?organization_id=${encodeURIComponent(
      organizationId,
    )}`,
    {
      token,
    },
  );
}

export function createInvitation(
  token: string,
  payload: CreateInvitationPayload,
) {
  return apiRequest<Invitation>(
    "/invitations",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
  );
}

export function acceptInvitation(
  token: string,
  invitationToken: string,
) {
  return apiRequest<AcceptInvitationResponse>(
    "/invitations/accept",
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        token: invitationToken,
      }),
    },
  );
}

export function revokeInvitation(
  token: string,
  invitationId: string,
) {
  return apiRequest<Invitation>(
    `/invitations/${encodeURIComponent(
      invitationId,
    )}/revoke`,
    {
      method: "PATCH",
      token,
    },
  );
}

export function resendInvitation(
  token: string,
  invitationId: string,
) {
  return apiRequest<Invitation>(
    `/invitations/${encodeURIComponent(
      invitationId,
    )}/resend`,
    {
      method: "PATCH",
      token,
    },
  );
}