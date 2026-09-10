import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    userId: string,
    projectId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Task);

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
    userId: string,
    projectId: string,
    title: string,
    description?: string,
    workflowStepId?: string,
    assignedToUserId?: string,
    status?: string,
    priority?: string,
    dueAt?: Date,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const tasksRepository = manager.getRepository(Task);
        const projectsRepository = manager.getRepository(Project);

        const project = await projectsRepository.findOne({
          where: {
            id: projectId,
            deleted_at: IsNull(),
          },
        });

        if (!project) {
          throw new Error('Project not found or inaccessible');
        }

        const task = tasksRepository.create({
          project_id: projectId,
          title,
          description: description ?? null,
          workflow_step_id: workflowStepId ?? null,
          assigned_to_user_id: assignedToUserId ?? null,
          status: status ?? 'pending',
          priority: priority ?? 'medium',
          due_at: dueAt ?? null,
        });

        const savedTask = await tasksRepository.save(task);

        await this.auditLogsService.create(
          project.organization_id,
          userId,
          'created',
          'task',
          savedTask.id,
          {
            title: savedTask.title,
            project_id: savedTask.project_id,
          },
          undefined,
          undefined,
          manager,
        );

        return savedTask;
      },
    );
  }
}