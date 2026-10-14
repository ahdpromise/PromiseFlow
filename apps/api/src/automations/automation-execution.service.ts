import { Injectable } from '@nestjs/common';
import {
  EntityManager,
  IsNull,
} from 'typeorm';

import { AutomationRun } from '../entities/automation-run.entity';
import { Automation } from '../entities/automation.entity';
import { Approval } from '../entities/approval.entity';
import { Task } from '../entities/task.entity';
import { NotificationsService } from '../notifications/notifications.service';

type TaskCreatedPayload = {
  taskId: string;
  projectId: string;
  taskTitle: string;
};

type TaskStatusChangedPayload = {
  taskId: string;
  projectId: string;
  taskTitle: string;
  previousStatus: string;
  status: string;
};

type ApprovalDecisionPayload = {
  approvalId: string;
  taskId: string;
  projectId: string;
  taskTitle: string;
  requestedByUserId: string;
  approverUserId: string;
};

type AutomationResult =
  Record<string, unknown>;

@Injectable()
export class AutomationExecutionService {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleTaskCreated(
    currentUserId: string,
    organizationId: string,
    payload: TaskCreatedPayload,
    manager: EntityManager,
  ) {
    const automationRepository =
      manager.getRepository(Automation);

    const automations =
      await automationRepository.find({
        where: {
          organization_id:
            organizationId,
          trigger_type:
            'task_created',
          is_enabled: true,
          deleted_at: IsNull(),
        },
        order: {
          created_at: 'ASC',
        },
      });

    for (const automation of automations) {
      const configuredProjectId =
        automation.trigger_config
          ?.project_id;

      if (
        typeof configuredProjectId ===
          'string' &&
        configuredProjectId !==
          payload.projectId
      ) {
        continue;
      }

      await this.executeAutomation(
        currentUserId,
        organizationId,
        automation,
        {
          event: 'task_created',
          task_id: payload.taskId,
          project_id:
            payload.projectId,
          task_title:
            payload.taskTitle,
        },
        payload.taskId,
        payload.taskTitle,
        manager,
      );
    }
  }

  async handleTaskStatusChanged(
    currentUserId: string,
    organizationId: string,
    payload: TaskStatusChangedPayload,
    manager: EntityManager,
  ) {
    if (
      payload.previousStatus ===
      payload.status
    ) {
      return;
    }

    const automationRepository =
      manager.getRepository(Automation);

    const automations =
      await automationRepository.find({
        where: {
          organization_id:
            organizationId,
          trigger_type:
            'task_status_changed',
          is_enabled: true,
          deleted_at: IsNull(),
        },
        order: {
          created_at: 'ASC',
        },
      });

    for (const automation of automations) {
      const configuredStatus =
        automation.trigger_config
          ?.status;

      if (
        typeof configuredStatus !==
          'string' ||
        configuredStatus !==
          payload.status
      ) {
        continue;
      }

      await this.executeAutomation(
        currentUserId,
        organizationId,
        automation,
        {
          event:
            'task_status_changed',
          task_id: payload.taskId,
          project_id:
            payload.projectId,
          task_title:
            payload.taskTitle,
          previous_status:
            payload.previousStatus,
          status: payload.status,
        },
        payload.taskId,
        payload.taskTitle,
        manager,
      );
    }
  }

  async handleApprovalApproved(
    currentUserId: string,
    organizationId: string,
    payload: ApprovalDecisionPayload,
    manager: EntityManager,
  ) {
    await this.handleApprovalDecision(
      currentUserId,
      organizationId,
      'approval_approved',
      payload,
      manager,
    );
  }

  async handleApprovalRejected(
    currentUserId: string,
    organizationId: string,
    payload: ApprovalDecisionPayload,
    manager: EntityManager,
  ) {
    await this.handleApprovalDecision(
      currentUserId,
      organizationId,
      'approval_rejected',
      payload,
      manager,
    );
  }

  private async handleApprovalDecision(
    currentUserId: string,
    organizationId: string,
    triggerType:
      | 'approval_approved'
      | 'approval_rejected',
    payload: ApprovalDecisionPayload,
    manager: EntityManager,
  ) {
    const automationRepository =
      manager.getRepository(Automation);

    const automations =
      await automationRepository.find({
        where: {
          organization_id:
            organizationId,
          trigger_type:
            triggerType,
          is_enabled: true,
          deleted_at: IsNull(),
        },
        order: {
          created_at: 'ASC',
        },
      });

    for (const automation of automations) {
      await this.executeAutomation(
        currentUserId,
        organizationId,
        automation,
        {
          event: triggerType,
          approval_id:
            payload.approvalId,
          task_id:
            payload.taskId,
          project_id:
            payload.projectId,
          task_title:
            payload.taskTitle,
          requested_by_user_id:
            payload.requestedByUserId,
          approver_user_id:
            payload.approverUserId,
        },
        payload.taskId,
        payload.taskTitle,
        manager,
      );
    }
  }

  private async executeAutomation(
    currentUserId: string,
    organizationId: string,
    automation: Automation,
    triggerPayload: Record<
      string,
      unknown
    >,
    taskId: string,
    taskTitle: string,
    manager: EntityManager,
  ) {
    const runRepository =
      manager.getRepository(
        AutomationRun,
      );

    const run =
      runRepository.create({
        automation_id:
          automation.id,
        organization_id:
          organizationId,
        status: 'running',
        trigger_payload:
          triggerPayload,
        result: null,
        error_message: null,
        started_at: new Date(),
        finished_at: null,
      });

    const savedRun =
      await runRepository.save(run);

    try {
      const result =
        await this.executeAction(
          currentUserId,
          organizationId,
          automation,
          taskId,
          taskTitle,
          manager,
        );

      savedRun.status =
        'succeeded';

      savedRun.result =
        result;

      savedRun.error_message =
        null;

      savedRun.finished_at =
        new Date();

      await runRepository.save(
        savedRun,
      );
    } catch (error) {
      savedRun.status = 'failed';

      savedRun.result = null;

      savedRun.error_message =
        error instanceof Error
          ? error.message
          : 'Unknown automation error';

      savedRun.finished_at =
        new Date();

      await runRepository.save(
        savedRun,
      );
    }
  }

  private async executeAction(
    currentUserId: string,
    organizationId: string,
    automation: Automation,
    taskId: string,
    taskTitle: string,
    manager: EntityManager,
  ): Promise<AutomationResult> {
    if (
      automation.action_type ===
      'create_notification'
    ) {
      return this.executeCreateNotification(
        currentUserId,
        organizationId,
        automation,
        taskId,
        taskTitle,
        manager,
      );
    }

    if (
      automation.action_type ===
      'update_task_status'
    ) {
      return this.executeUpdateTaskStatus(
        automation,
        taskId,
        manager,
      );
    }

    if (
      automation.action_type ===
      'create_approval_request'
    ) {
      return this.executeCreateApprovalRequest(
        currentUserId,
        automation,
        taskId,
        manager,
      );
    }

    throw new Error(
      `Unsupported automation action: ${automation.action_type}`,
    );
  }

  private async executeCreateNotification(
    currentUserId: string,
    organizationId: string,
    automation: Automation,
    taskId: string,
    taskTitle: string,
    manager: EntityManager,
  ): Promise<AutomationResult> {
    const title =
      automation.action_config
        ?.title;

    const message =
      automation.action_config
        ?.message;

    if (
      typeof title !== 'string' ||
      typeof message !== 'string'
    ) {
      throw new Error(
        'Invalid notification action configuration',
      );
    }

    const notification =
      await this.notificationsService.create(
        currentUserId,
        organizationId,
        currentUserId,
        'automation',
        title,
        message,
        `/tasks/${taskId}`,
        {
          taskTitle,
          automationId:
            automation.id,
        },
        manager,
      );

    return {
      action:
        'create_notification',
      notification_id:
        notification
          ?.notification_id ??
        null,
    };
  }

  private async executeUpdateTaskStatus(
    automation: Automation,
    taskId: string,
    manager: EntityManager,
  ): Promise<AutomationResult> {
    const status =
      automation.action_config
        ?.status;

    if (typeof status !== 'string') {
      throw new Error(
        'Invalid task status action configuration',
      );
    }

    const taskRepository =
      manager.getRepository(Task);

    const task =
      await taskRepository.findOne({
        where: {
          id: taskId,
          deleted_at: IsNull(),
        },
      });

    if (!task) {
      throw new Error(
        'Task not found for automation',
      );
    }

    const previousStatus =
      task.status;

    task.status = status;

    const savedTask =
      await taskRepository.save(task);

    return {
      action:
        'update_task_status',
      task_id: savedTask.id,
      previous_status:
        previousStatus,
      status:
        savedTask.status,
    };
  }

  private async executeCreateApprovalRequest(
    currentUserId: string,
    automation: Automation,
    taskId: string,
    manager: EntityManager,
  ): Promise<AutomationResult> {
    const approverId =
      automation.action_config
        ?.approver_id;

    if (
      typeof approverId !== 'string'
    ) {
      throw new Error(
        'Invalid approval request action configuration',
      );
    }

    const approvalRepository =
      manager.getRepository(Approval);

    const approval =
      approvalRepository.create({
        task_id: taskId,
        approver_user_id:
          approverId,
        requested_by_user_id:
          currentUserId,
        status: 'pending',
        comment: null,
        decision_comment: null,
      });

    const savedApproval =
      await approvalRepository.save(
        approval,
      );

    return {
      action:
        'create_approval_request',
      approval_id:
        savedApproval.id,
      task_id:
        savedApproval.task_id,
      approver_user_id:
        savedApproval.approver_user_id,
    };
  }
}