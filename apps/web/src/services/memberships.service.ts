import { apiRequest } from "@/lib/api";

export type OrganizationMember = {
  membership_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
};

export function getOrganizationMemberDirectory(
  token: string,
  organizationId: string,
) {
  return apiRequest<OrganizationMember[]>(
    `/memberships/directory?organization_id=${organizationId}`,
    {
      token,
    },
  );
}