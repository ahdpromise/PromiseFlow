
import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { MembershipsService } from './memberships.service';

type PermissionCheckResult = {
  allowed: boolean;
};

@Injectable()
export class OrganizationAccessService {
  constructor(
    private readonly membershipsService: MembershipsService,
  ) {}

  async assertMember(
    userId: string,
    organizationId: string,
  ) {
    const membership =
      await this.membershipsService.findByUserAndOrganization(
        userId,
        organizationId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    return membership;
  }

  async assertPermission(
    manager: EntityManager,
    userId: string,
    organizationId: string,
    permission: string,
  ): Promise<void> {
    const result: PermissionCheckResult[] =
      await manager.query(
        `
          SELECT EXISTS (
            SELECT 1
            FROM public.memberships m
            JOIN public.roles r
              ON r.id = m.role_id
             AND r.organization_id = m.organization_id
            JOIN public.role_permissions rp
              ON rp.role_id = r.id
            JOIN public.permissions p
              ON p.id = rp.permission_id
            WHERE m.user_id = $1
              AND m.organization_id = $2
              AND m.deleted_at IS NULL
              AND r.deleted_at IS NULL
              AND p.deleted_at IS NULL
              AND p.slug = $3
          ) AS allowed
        `,
        [userId, organizationId, permission],
      );

    if (result[0]?.allowed !== true) {
      throw new ForbiddenException(
        `You do not have permission: ${permission}`,
      );
    }
  }
}
