import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Team } from '../entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    userId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Team);

        return repository.find({
          where: {
            organization_id: organizationId,
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
    organizationId: string,
    name: string,
    slug: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Team);

        const team = repository.create({
          organization_id: organizationId,
          name,
          slug,
        });

        return repository.save(team);
      },
    );
  }
}