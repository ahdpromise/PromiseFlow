import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Task } from '../entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,

    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(projectId: string) {
    return this.tasksRepository.find({
      where: {
        project_id: projectId,
        deleted_at: IsNull(),
      },
      order: {
        created_at: 'DESC',
      },
    });
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
    const task = this.tasksRepository.create({
      project_id: projectId,
      title,
      description: description ?? null,
      workflow_step_id: workflowStepId ?? null,
      assigned_to_user_id: assignedToUserId ?? null,
      status: status ?? 'pending',
      priority: priority ?? 'medium',
      due_at: dueAt ?? null,
    });

    const savedTask = await this.tasksRepository.save(task);

    await this.auditLogsService.create(
      userId,
      'created',
      'task',
      savedTask.id,
      {
        title: savedTask.title,
        project_id: savedTask.project_id,
      },
    );

    return savedTask;
  }
}