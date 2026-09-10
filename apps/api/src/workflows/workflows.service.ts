import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Workflow } from '../entities/workflow.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    projectId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Workflow);

        return repository.find({
          where: {
            project_id: projectId,
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
    currentUserId: string,
    projectId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Workflow);

        const workflow = repository.create({
          project_id: projectId,
          name,
          slug,
          description: description ?? null,
        });

        return repository.save(workflow);
      },
    );
  }
}