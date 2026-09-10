import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(userId: string) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Organization);

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

  async create(
    userId: string,
    name: string,
    slug: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const result: Array<{ organization_id: string }> =
          await manager.query(
            `
              SELECT public.bootstrap_organization(
                $1,
                $2
              ) AS organization_id
            `,
            [name, slug],
          );

        const organizationId = result[0]?.organization_id;

        const repository = manager.getRepository(Organization);

        return repository.findOneOrFail({
          where: {
            id: organizationId,
            deleted_at: IsNull(),
          },
        });
      },
    );
  }
}