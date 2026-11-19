
import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Membership } from '../entities/membership.entity';

export type OrganizationMemberDirectoryItem = {
  membership_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
};

@Injectable()
export class MembershipsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(userId: string) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Membership);

        return repository.find({
          where: {
            deleted_at: IsNull(),
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Membership);

        return repository.findOne({
          where: {
            user_id: userId,
            organization_id: organizationId,
            deleted_at: IsNull(),
          },
        });
      },
    );
  }

  async getOrganizationMemberDirectory(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMemberDirectoryItem[]> {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        return manager.query(
          `
            SELECT *
            FROM public.get_organization_member_directory($1)
          `,
          [organizationId],
        ) as Promise<OrganizationMemberDirectoryItem[]>;
      },
    );
  }
}
