
import { Injectable } from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { Role } from '../entities/roles.entity';

type CreatedRoleResult = {
  id: string;
};

@Injectable()
export class RolesService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        return manager.getRepository(Role).find({
          where: {
            organization_id: organizationId,
          },
          order: {
            created_at: 'ASC',
          },
        });
      },
    );
  }

  async create(
    currentUserId: string,
    organizationId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const result: CreatedRoleResult[] =
          await manager.query(
            `
              SELECT
                public.create_organization_role(
                  $1::uuid,
                  $2::text,
                  $3::text,
                  $4::text
                ) AS id
            `,
            [
              organizationId,
              name,
              slug,
              description ?? null,
            ],
          );

        const roleId = result[0]?.id;

        if (!roleId) {
          throw new Error(
            'Role creation did not return an ID',
          );
        }

        return manager.getRepository(Role).findOneOrFail({
          where: {
            id: roleId,
            organization_id: organizationId,
          },
        });
      },
    );
  }
}
