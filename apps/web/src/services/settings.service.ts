
import { apiRequest } from "@/lib/api";

export type CurrentUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Membership = {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Role = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function getCurrentUser(
  token: string,
) {
  return apiRequest<CurrentUser>(
    "/users/me",
    {
      token,
    },
  );
}

export function updateCurrentUserProfile(
  token: string,
  firstName: string,
  lastName: string,
) {
  return apiRequest<CurrentUser>(
    "/users/me/profile",
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
      }),
    },
  );
}

export function updateCurrentUserPassword(
  token: string,
  password: string,
) {
  return apiRequest<void>(
    "/users/me/password",
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        password,
      }),
    },
  );
}

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

export function updateOrganizationSettings(
  token: string,
  organizationId: string,
  name: string,
  slug: string,
) {
  return apiRequest<Organization>(
    `/organizations/${organizationId}/settings`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify({
        name,
        slug,
      }),
    },
  );
}

export function getMemberships(
  token: string,
) {
  return apiRequest<Membership[]>(
    "/memberships",
    {
      token,
    },
  );
}

export function getRoles(
  token: string,
  organizationId: string,
) {
  return apiRequest<Role[]>(
    `/roles?organization_id=${organizationId}`,
    {
      token,
    },
  );
}
