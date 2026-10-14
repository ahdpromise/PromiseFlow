import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AutomationExecutionService } from '../automations/automation-execution.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Approval } from '../entities/approval.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly automationExecutionService: AutomationExecutionService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    taskId?: string,
    status?: string,
    projectId?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Approval);

        const query =
          repository
            .createQueryBuilder(
              'approval',
            )
            .innerJoin(
              'approval.task',
              'task',
              'task.deleted_at IS NULL',
            )
            .innerJoin(
              'task.project',
              'project',
              'project.deleted_at IS NULL',
            )
            .innerJoin(
              'approval.approver_user',
              'approver',
              'approver.deleted_at IS NULL',
            )
            .innerJoin(
              'approval.requested_by_user',
              'requester',
              'requester.deleted_at IS NULL',
            )
            .select([
              'approval.id',
              'approval.task_id',
              'approval.approver_user_id',
              'approval.requested_by_user_id',
              'approval.status',
              'approval.comment',
              'approval.decision_comment',
              'approval.decided_at',
              'approval.created_at',
              'approval.updated_at',
              'task.id',
              'task.title',
              'task.project_id',
              'project.id',
              'project.name',
              'approver.id',
              'approver.first_name',
              'approver.last_name',
              'approver.email',
              'requester.id',
              'requester.first_name',
              'requester.last_name',
              'requester.email',
            ])
            .where(
              'approval.deleted_at IS NULL',
            )
            .orderBy(
              'approval.created_at',
              'DESC',
            );

        if (taskId) {
          query.andWhere(
            'approval.task_id = :taskId',
            {
              taskId,
            },
          );
        }

        if (status) {
          if (
            ![
              'pending',
              'approved',
              'rejected',
            ].includes(status)
          ) {
            throw new BadRequestException(
              'Invalid approval status',
            );
          }

          query.andWhere(
            'approval.status = :status',
            {
              status,
            },
          );
        }

        if (projectId) {
          query.andWhere(
            'project.id = :projectId',
            {
              projectId,
            },
          );
        }

        return query.getMany();
      },
    );
  }

  async findOne(
    currentUserId: string,
    approvalId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Approval);

        const approval =
          await repository
            .createQueryBuilder(
              'approval',
            )
            .innerJoin(
              'approval.task',
              'task',
              'task.deleted_at IS NULL',
            )
            .innerJoin(
              'task.project',
              'project',
              'project.deleted_at IS NULL',
            )
            .innerJoin(
              'approval.approver_user',
              'approver',
              'approver.deleted_at IS NULL',
            )
            .innerJoin(
              'approval.requested_by_user',
              'requester',
              'requester.deleted_at IS NULL',
            )
            .select([
              'approval.id',
              'approval.task_id',
              'approval.approver_user_id',
              'approval.requested_by_user_id',
              'approval.status',
              'approval.comment',
              'approval.decision_comment',
              'approval.decided_at',
              'approval.created_at',
              'approval.updated_at',
              'task.id',
              'task.title',
              'task.project_id',
              'task.status',
              'task.priority',
              'task.description',
              'task.due_at',
              'project.id',
              'project.name',
              'approver.id',
              'approver.first_name',
              'approver.last_name',
              'approver.email',
              'requester.id',
              'requester.first_name',
              'requester.last_name',
              'requester.email',
            ])
            .where(
              'approval.id = :approvalId',
              {
                approvalId,
              },
            )
            .andWhere(
              'approval.deleted_at IS NULL',
            )
            .getOne();

        if (!approval) {
          throw new NotFoundException(
            'Approval not found or inaccessible',
          );
        }

        return approval;
      },
    );
  }

  async create(
    currentUserId: string,
    taskId: string,
    approverUserId: string,
    comment?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Approval);

        const approval =
          repository.create({
            task_id: taskId,
            approver_user_id:
              approverUserId,
            requested_by_user_id:
              currentUserId,
            status: 'pending',
            comment:
              comment ?? null,
            decision_comment: null,
          });

        return repository.save(
          approval,
        );
      },
    );
  }

  async decide(
    currentUserId: string,
    approvalId: string,
    status:
      | 'approved'
      | 'rejected',
    decisionComment?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const approvalsRepository =
          manager.getRepository(
            Approval,
          );

        const tasksRepository =
          manager.getRepository(Task);

        const projectsRepository =
          manager.getRepository(
            Project,
          );

        const approval =
          await approvalsRepository.findOne({
            where: {
              id: approvalId,
              deleted_at:
                IsNull(),
            },
          });

        if (!approval) {
          throw new NotFoundException(
            'Approval not found or inaccessible',
          );
        }

        if (
          approval.approver_user_id !==
          currentUserId
        ) {
          throw new ForbiddenException(
            'Only the assigned approver can decide this approval',
          );
        }

        if (
          approval.status !==
          'pending'
        ) {
          throw new BadRequestException(
            'This approval has already been decided',
          );
        }

        const task =
          await tasksRepository.findOne({
            where: {
              id: approval.task_id,
              deleted_at:
                IsNull(),
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
              deleted_at:
                IsNull(),
            },
          });

        if (!project) {
          throw new NotFoundException(
            'Project not found or inaccessible',
          );
        }

        approval.status =
          status;

        approval.decision_comment =
          decisionComment?.trim() ||
          null;

        approval.decided_at =
          new Date();

        const savedApproval =
          await approvalsRepository.save(
            approval,
          );

        await this.auditLogsService.create(
          project.organization_id,
          currentUserId,
          status,
          'approval',
          savedApproval.id,
          {
            task_id: task.id,
            task_title: task.title,
            project_id:
              project.id,
            status:
              savedApproval.status,
            decision_comment:
              savedApproval.decision_comment,
          },
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          currentUserId,
          project.organization_id,
          status,
          'approval',
          savedApproval.id,
          {
            task_id: task.id,
            task_title: task.title,
            project_id:
              project.id,
            status:
              savedApproval.status,
            decision_comment:
              savedApproval.decision_comment,
          },
          manager,
        );

        await this.notificationsService.create(
          currentUserId,
          project.organization_id,
          approval.requested_by_user_id,
          status === 'approved'
            ? 'approval_approved'
            : 'approval_rejected',
          status === 'approved'
            ? 'Task approved'
            : 'Task rejected',
          status === 'approved'
            ? `Your approval request for "${task.title}" was approved.`
            : `Your approval request for "${task.title}" was rejected.`,
          `/tasks/${task.id}`,
          {
            taskTitle: task.title,
          },
          manager,
        );

        const automationPayload = {
          approvalId:
            savedApproval.id,
          taskId:
            task.id,
          projectId:
            task.project_id,
          taskTitle:
            task.title,
          requestedByUserId:
            approval.requested_by_user_id,
          approverUserId:
            approval.approver_user_id,
        };

        if (status === 'approved') {
          await this.automationExecutionService.handleApprovalApproved(
            currentUserId,
            project.organization_id,
            automationPayload,
            manager,
          );
        } else {
          await this.automationExecutionService.handleApprovalRejected(
            currentUserId,
            project.organization_id,
            automationPayload,
            manager,
          );
        }

        return savedApproval;
      },
    );
  }
}