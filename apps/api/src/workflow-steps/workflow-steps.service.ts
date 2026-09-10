import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { WorkflowStep } from '../entities/workflow-step.entity';

@Injectable()
export class WorkflowStepsService {
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
        const repository = manager.getRepository(WorkflowStep);

        return repository.find({
          where: {
            workflow_id: workflowId,
            deleted_at: IsNull(),
          },
          order: {
            position: 'ASC',
          },
        });
      },
    );
  }

  async create(
    currentUserId: string,
    workflowId: string,
    name: string,
    slug: string,
    stepType: string,
    position: number,
    description?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(WorkflowStep);

        const workflowStep = repository.create({
          workflow_id: workflowId,
          name,
          slug,
          step_type: stepType,
          position,
          description: description ?? null,
        });

        return repository.save(workflowStep);
      },
    );
  }
}