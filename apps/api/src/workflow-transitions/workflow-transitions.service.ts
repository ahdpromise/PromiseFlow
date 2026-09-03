import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { WorkflowTransition } from '../entities/workflow-transition.entity';

@Injectable()
export class WorkflowTransitionsService {
  constructor(
    @InjectRepository(WorkflowTransition)
    private readonly workflowTransitionsRepository: Repository<WorkflowTransition>,
  ) {}

  async findAll(workflowId: string) {
    return this.workflowTransitionsRepository.find({
      where: {
        workflow_id: workflowId,
        deleted_at: IsNull(),
      },
    });
  }

  async create(
    workflowId: string,
    fromStepId: string,
    toStepId: string,
    name: string,
    slug: string,
    condition?: string,
  ) {
    const workflowTransition =
      this.workflowTransitionsRepository.create({
        workflow_id: workflowId,
        from_step_id: fromStepId,
        to_step_id: toStepId,
        name,
        slug,
        condition: condition ?? null,
      });

    return this.workflowTransitionsRepository.save(
      workflowTransition,
    );
  }
}