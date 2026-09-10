import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { WorkflowTransition } from '../entities/workflow-transition.entity';

@Injectable()
export class WorkflowTransitionsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    workflowId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(WorkflowTransition);

        return repository.find({
          where: {
            workflow_id: workflowId,
            deleted_at: IsNull(),
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
    workflowId: string,
    fromStepId: string,
    toStepId: string,
    name: string,
    slug: string,
    condition?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(WorkflowTransition);

        const workflowTransition = repository.create({
          workflow_id: workflowId,
          from_step_id: fromStepId,
          to_step_id: toStepId,
          name,
          slug,
          condition: condition ?? null,
        });

        return repository.save(workflowTransition);
      },
    );
  }
}