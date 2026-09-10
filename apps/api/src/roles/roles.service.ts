import { Injectable } from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { Role } from '../entities/roles.entity';

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
        const rolesRepository =
          manager.getRepository(Role);

        const role = rolesRepository.create({
          organization_id: organizationId,
          name,
          slug,
          description: description ?? null,
        });

        return rolesRepository.save(role);
      },
    );
  }
}