import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AutomationExecutionService } from '../automations/automation-execution.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';

@Injectable()
export class TasksService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly automationExecutionService: AutomationExecutionService,
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
        const repository =
          manager.getRepository(Task);

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

  async findOne(
    userId: string,
    taskId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Task);

        const task =
          await repository.findOne({
            where: {
              id: taskId,
              deleted_at: IsNull(),
            },
          });

        if (!task) {
          throw new NotFoundException(
            'Task not found or inaccessible',
          );
        }

        return task;
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
        const tasksRepository =
          manager.getRepository(Task);

        const projectsRepository =
          manager.getRepository(Project);

        const project =
          await projectsRepository.findOne({
            where: {
              id: projectId,
              deleted_at: IsNull(),
            },
          });

        if (!project) {
          throw new NotFoundException(
            'Project not found or inaccessible',
          );
        }

        const task =
          tasksRepository.create({
            project_id: projectId,
            title,
            description:
              description ?? null,
            workflow_step_id:
              workflowStepId ?? null,
            assigned_to_user_id:
              assignedToUserId ?? null,
            status:
              status ?? 'pending',
            priority:
              priority ?? 'medium',
            due_at:
              dueAt ?? null,
          });

        const savedTask =
          await tasksRepository.save(
            task,
          );

        await this.auditLogsService.create(
          project.organization_id,
          userId,
          'created',
          'task',
          savedTask.id,
          {
            title: savedTask.title,
            project_id:
              savedTask.project_id,
          },
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          project.organization_id,
          'created',
          'task',
          savedTask.id,
          {
            title: savedTask.title,
            project_id:
              savedTask.project_id,
          },
          manager,
        );

        await this.automationExecutionService.handleTaskCreated(
          userId,
          project.organization_id,
          {
            taskId: savedTask.id,
            projectId:
              savedTask.project_id,
            taskTitle:
              savedTask.title,
          },
          manager,
        );

        return savedTask;
      },
    );
  }

  async update(
    userId: string,
    taskId: string,
    body: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      due_at?: Date | null;
    },
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const tasksRepository =
          manager.getRepository(Task);

        const projectsRepository =
          manager.getRepository(Project);

        const task =
          await tasksRepository.findOne({
            where: {
              id: taskId,
              deleted_at: IsNull(),
            },
          });

        if (!task) {
          throw new NotFoundException(
            'Task not found or inaccessible',
          );
        }

        const project =
          await projectsRepository.findOne({
            where: {
              id: task.project_id,
              deleted_at: IsNull(),
            },
          });

        if (!project) {
          throw new NotFoundException(
            'Project not found or inaccessible',
          );
        }

        const previousStatus =
          task.status;

        if (body.title !== undefined) {
          task.title = body.title;
        }

        if (
          body.description !== undefined
        ) {
          task.description =
            body.description;
        }

        if (body.status !== undefined) {
          task.status = body.status;
        }

        if (
          body.priority !== undefined
        ) {
          task.priority =
            body.priority;
        }

        if (body.due_at !== undefined) {
          task.due_at = body.due_at;
        }

        const savedTask =
          await tasksRepository.save(
            task,
          );

        await this.auditLogsService.create(
          project.organization_id,
          userId,
          'updated',
          'task',
          savedTask.id,
          {
            title: savedTask.title,
            project_id:
              savedTask.project_id,
            status: savedTask.status,
            priority:
              savedTask.priority,
          },
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          project.organization_id,
          'updated',
          'task',
          savedTask.id,
          {
            title: savedTask.title,
            project_id:
              savedTask.project_id,
            status: savedTask.status,
            priority:
              savedTask.priority,
          },
          manager,
        );

        if (
          previousStatus !==
          savedTask.status
        ) {
          await this.automationExecutionService.handleTaskStatusChanged(
            userId,
            project.organization_id,
            {
              taskId: savedTask.id,
              projectId:
                savedTask.project_id,
              taskTitle:
                savedTask.title,
              previousStatus,
              status:
                savedTask.status,
            },
            manager,
          );
        }

        return savedTask;
      },
    );
  }

  async remove(
    userId: string,
    taskId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const tasksRepository =
          manager.getRepository(Task);

        const projectsRepository =
          manager.getRepository(Project);

        const task =
          await tasksRepository.findOne({
            where: {
              id: taskId,
              deleted_at: IsNull(),
            },
          });

        if (!task) {
          throw new NotFoundException(
            'Task not found or inaccessible',
          );
        }

        const project =
          await projectsRepository.findOne({
            where: {
              id: task.project_id,
              deleted_at: IsNull(),
            },
          });

        if (!project) {
          throw new NotFoundException(
            'Project not found or inaccessible',
          );
        }

        const result: Array<{
          soft_delete_task: boolean;
        }> = await manager.query(
          `
            SELECT public.soft_delete_task($1)
              AS soft_delete_task
          `,
          [taskId],
        );

        const wasDeleted =
          result[0]?.soft_delete_task ===
          true;

        if (!wasDeleted) {
          throw new NotFoundException(
            'Task not found or inaccessible',
          );
        }

        await this.auditLogsService.create(
          project.organization_id,
          userId,
          'deleted',
          'task',
          task.id,
          {
            title: task.title,
            project_id:
              task.project_id,
          },
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          project.organization_id,
          'deleted',
          'task',
          task.id,
          {
            title: task.title,
            project_id:
              task.project_id,
          },
          manager,
        );

        return {
          id: taskId,
          deleted: true,
        };
      },
    );
  }
}