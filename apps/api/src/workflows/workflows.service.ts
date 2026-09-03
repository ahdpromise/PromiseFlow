import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Workflow } from '../entities/workflow.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
  ) {}

  async findAll(projectId: string) {
    return this.workflowsRepository.find({
      where: {
        project_id: projectId,
        deleted_at: IsNull(),
      },
    });
  }

  async create(
    projectId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    const workflow = this.workflowsRepository.create({
      project_id: projectId,
      name,
      slug,
      description: description ?? null,
    });

    return this.workflowsRepository.save(workflow);
  }
}