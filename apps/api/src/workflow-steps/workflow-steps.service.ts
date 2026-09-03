import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { WorkflowStep } from '../entities/workflow-step.entity';

@Injectable()
export class WorkflowStepsService {
  constructor(
    @InjectRepository(WorkflowStep)
    private readonly workflowStepsRepository: Repository<WorkflowStep>,
  ) {}

  async findAll(workflowId: string) {
    return this.workflowStepsRepository.find({
      where: {
        workflow_id: workflowId,
        deleted_at: IsNull(),
      },
      order: {
        position: 'ASC',
      },
    });
  }

  async create(
    workflowId: string,
    name: string,
    slug: string,
    stepType: string,
    position: number,
    description?: string,
  ) {
    const workflowStep = this.workflowStepsRepository.create({
      workflow_id: workflowId,
      name,
      slug,
      step_type: stepType,
      position,
      description: description ?? null,
    });

    return this.workflowStepsRepository.save(workflowStep);
  }
}