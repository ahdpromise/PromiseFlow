import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsService {
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
        const repository = manager.getRepository(Project);

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
    description?: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Project);

        const project = repository.create({
          organization_id: organizationId,
          name,
          slug,
          description: description ?? null,
        });

        return repository.save(project);
      },
    );
  }
}