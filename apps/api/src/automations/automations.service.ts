
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { AutomationRun } from '../entities/automation-run.entity';
import { Automation } from '../entities/automation.entity';

const ALLOWED_TRIGGER_TYPES = [
  'task_created',
  'task_status_changed',
  'approval_approved',
  'approval_rejected',
] as const;

const ALLOWED_ACTION_TYPES = [
  'create_notification',
  'update_task_status',
  'create_approval_request',
] as const;

const ALLOWED_AUTOMATION_TASK_STATUS_VALUES = [
  'pending',
  'in_progress',
  'completed',
] as const;

type AutomationConfig = Record<string, unknown>;

@Injectable()
export class AutomationsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
  ) {}

  private async recordActivity(
    manager: EntityManager,
    userId: string,
    organizationId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.auditLogsService.create(
      organizationId,
      userId,
      action,
      'automation',
      entityId,
      metadata,
      undefined,
      undefined,
      manager,
    );

    await this.activitiesService.create(
      userId,
      organizationId,
      action,
      'automation',
      entityId,
      metadata,
      manager,
    );
  }

  private getAutomationMetadata(automation: Automation) {
    return {
      name: automation.name,
      description: automation.description,
      triggerType: automation.trigger_type,
      actionType: automation.action_type,
      isEnabled: automation.is_enabled,
    };
  }

  async findAll(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Automation);

        return repository
          .createQueryBuilder('automation')
          .leftJoin(
            'automation.creator',
            'creator',
            'creator.deleted_at IS NULL',
          )
          .select([
            'automation.id',
            'automation.organization_id',
            'automation.name',
            'automation.description',
            'automation.trigger_type',
            'automation.trigger_config',
            'automation.action_type',
            'automation.action_config',
            'automation.is_enabled',
            'automation.created_by',
            'automation.created_at',
            'automation.updated_at',
            'creator.id',
            'creator.first_name',
            'creator.last_name',
            'creator.email',
          ])
          .where(
            'automation.organization_id = :organizationId',
            { organizationId },
          )
          .andWhere('automation.deleted_at IS NULL')
          .orderBy('automation.created_at', 'DESC')
          .getMany();
      },
    );
  }

  async findRuns(
    currentUserId: string,
    automationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const automationRepository =
          manager.getRepository(Automation);

        const automation =
          await automationRepository.findOne({
            where: {
              id: automationId,
              deleted_at: IsNull(),
            },
          });

        if (!automation) {
          throw new NotFoundException(
            'Automation not found or inaccessible',
          );
        }

        const runRepository =
          manager.getRepository(AutomationRun);

        return runRepository
          .createQueryBuilder('run')
          .select([
            'run.id',
            'run.automation_id',
            'run.organization_id',
            'run.status',
            'run.trigger_payload',
            'run.result',
            'run.error_message',
            'run.started_at',
            'run.finished_at',
          ])
          .where(
            'run.automation_id = :automationId',
            { automationId },
          )
          .andWhere(
            'run.organization_id = :organizationId',
            {
              organizationId: automation.organization_id,
            },
          )
          .orderBy('run.started_at', 'DESC')
          .getMany();
      },
    );
  }

  async create(
    currentUserId: string,
    organizationId: string,
    name: string,
    description: string | undefined,
    triggerType: string,
    actionType: string,
    triggerConfig?: AutomationConfig,
    actionConfig?: AutomationConfig,
  ) {
    const trimmedName = name?.trim();

    if (!trimmedName) {
      throw new BadRequestException(
        'Automation name is required',
      );
    }

    this.validateTriggerType(triggerType);
    this.validateActionType(actionType);

    const validatedTriggerConfig =
      this.validateTriggerConfig(
        triggerType,
        triggerConfig,
      );

    const validatedActionConfig =
      this.validateActionConfig(
        actionType,
        actionConfig,
      );

    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Automation);

        if (
          triggerType === 'task_created' &&
          typeof validatedTriggerConfig.project_id ===
            'string'
        ) {
          const projects = await manager.query<
            Array<{ id: string }>
          >(
            `
              SELECT id
              FROM public.projects
              WHERE id = $1
                AND organization_id = $2
                AND deleted_at IS NULL
              LIMIT 1
            `,
            [
              validatedTriggerConfig.project_id,
              organizationId,
            ],
          );

          if (projects.length === 0) {
            throw new BadRequestException(
              'Selected project is invalid or inaccessible',
            );
          }
        }

        if (
          actionType === 'create_approval_request' &&
          typeof validatedActionConfig.approver_id ===
            'string'
        ) {
          const approvers = await manager.query<
            Array<{ user_id: string }>
          >(
            `
              SELECT directory.user_id
              FROM public.get_organization_member_directory($1)
                AS directory
              WHERE directory.user_id = $2
              LIMIT 1
            `,
            [
              organizationId,
              validatedActionConfig.approver_id,
            ],
          );

          if (approvers.length === 0) {
            throw new BadRequestException(
              'Selected approver is invalid or inaccessible',
            );
          }
        }

        const automation = repository.create({
          organization_id: organizationId,
          name: trimmedName,
          description: description?.trim() || null,
          trigger_type: triggerType,
          trigger_config: validatedTriggerConfig,
          action_type: actionType,
          action_config: validatedActionConfig,
          is_enabled: true,
          created_by: currentUserId,
        });

        const savedAutomation =
          await repository.save(automation);

        await this.recordActivity(
          manager,
          currentUserId,
          organizationId,
          'created',
          savedAutomation.id,
          this.getAutomationMetadata(savedAutomation),
        );

        return savedAutomation;
      },
    );
  }

  async update(
    currentUserId: string,
    automationId: string,
    name: string,
    description: string | undefined,
    triggerType: string,
    actionType: string,
    triggerConfig?: AutomationConfig,
    actionConfig?: AutomationConfig,
  ) {
    const trimmedName = name?.trim();

    if (!trimmedName) {
      throw new BadRequestException(
        'Automation name is required',
      );
    }

    this.validateTriggerType(triggerType);
    this.validateActionType(actionType);

    const validatedTriggerConfig =
      this.validateTriggerConfig(
        triggerType,
        triggerConfig,
      );

    const validatedActionConfig =
      this.validateActionConfig(
        actionType,
        actionConfig,
      );

    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Automation);

        const automation = await repository.findOne({
          where: {
            id: automationId,
            deleted_at: IsNull(),
          },
        });

        if (!automation) {
          throw new NotFoundException(
            'Automation not found or inaccessible',
          );
        }

        if (
          triggerType === 'task_created' &&
          typeof validatedTriggerConfig.project_id ===
            'string'
        ) {
          const projects = await manager.query<
            Array<{ id: string }>
          >(
            `
              SELECT id
              FROM public.projects
              WHERE id = $1
                AND organization_id = $2
                AND deleted_at IS NULL
              LIMIT 1
            `,
            [
              validatedTriggerConfig.project_id,
              automation.organization_id,
            ],
          );

          if (projects.length === 0) {
            throw new BadRequestException(
              'Selected project is invalid or inaccessible',
            );
          }
        }

        if (
          actionType === 'create_approval_request' &&
          typeof validatedActionConfig.approver_id ===
            'string'
        ) {
          const approvers = await manager.query<
            Array<{ user_id: string }>
          >(
            `
              SELECT directory.user_id
              FROM public.get_organization_member_directory($1)
                AS directory
              WHERE directory.user_id = $2
              LIMIT 1
            `,
            [
              automation.organization_id,
              validatedActionConfig.approver_id,
            ],
          );

          if (approvers.length === 0) {
            throw new BadRequestException(
              'Selected approver is invalid or inaccessible',
            );
          }
        }

        automation.name = trimmedName;
        automation.description =
          description?.trim() || null;
        automation.trigger_type = triggerType;
        automation.trigger_config =
          validatedTriggerConfig;
        automation.action_type = actionType;
        automation.action_config =
          validatedActionConfig;
        automation.updated_at = new Date();

        const savedAutomation =
          await repository.save(automation);

        await this.recordActivity(
          manager,
          currentUserId,
          savedAutomation.organization_id,
          'updated',
          savedAutomation.id,
          this.getAutomationMetadata(savedAutomation),
        );

        return savedAutomation;
      },
    );
  }

  async setEnabled(
    currentUserId: string,
    automationId: string,
    isEnabled: boolean,
  ) {
    if (typeof isEnabled !== 'boolean') {
      throw new BadRequestException(
        'is_enabled must be a boolean',
      );
    }

    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Automation);

        const automation = await repository.findOne({
          where: {
            id: automationId,
            deleted_at: IsNull(),
          },
        });

        if (!automation) {
          throw new NotFoundException(
            'Automation not found or inaccessible',
          );
        }

        const previousEnabled = automation.is_enabled;

        automation.is_enabled = isEnabled;
        automation.updated_at = new Date();

        const savedAutomation =
          await repository.save(automation);

        if (previousEnabled !== isEnabled) {
          await this.recordActivity(
            manager,
            currentUserId,
            savedAutomation.organization_id,
            isEnabled ? 'enabled' : 'disabled',
            savedAutomation.id,
            {
              ...this.getAutomationMetadata(
                savedAutomation,
              ),
              previousEnabled,
            },
          );
        }

        return savedAutomation;
      },
    );
  }

  async remove(
    currentUserId: string,
    automationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Automation);

        const automation = await repository.findOne({
          where: {
            id: automationId,
            deleted_at: IsNull(),
          },
        });

        if (!automation) {
          throw new NotFoundException(
            'Automation not found or inaccessible',
          );
        }

        const metadata =
          this.getAutomationMetadata(automation);

        await manager.query(
          'SELECT public.soft_delete_automation($1)',
          [automationId],
        );

        const remaining = await repository.findOne({
          where: {
            id: automationId,
            deleted_at: IsNull(),
          },
        });

        if (remaining) {
          throw new BadRequestException(
            'Automation could not be deleted',
          );
        }

        await this.recordActivity(
          manager,
          currentUserId,
          automation.organization_id,
          'deleted',
          automation.id,
          metadata,
        );

        return {
          success: true,
        };
      },
    );
  }

  private validateTriggerConfig(
    triggerType: string,
    triggerConfig?: AutomationConfig,
  ): AutomationConfig {
    if (
      triggerConfig === undefined ||
      triggerConfig === null
    ) {
      if (triggerType === 'task_status_changed') {
        throw new BadRequestException(
          'Task status is required',
        );
      }

      return {};
    }

    if (
      typeof triggerConfig !== 'object' ||
      Array.isArray(triggerConfig)
    ) {
      throw new BadRequestException(
        'trigger_config must be an object',
      );
    }

    if (triggerType === 'task_created') {
      const projectId = triggerConfig.project_id;

      if (
        projectId === undefined ||
        projectId === null ||
        projectId === ''
      ) {
        return {};
      }

      if (typeof projectId !== 'string') {
        throw new BadRequestException(
          'project_id must be a string',
        );
      }

      return {
        project_id: projectId,
      };
    }

    if (triggerType === 'task_status_changed') {
      const status = triggerConfig.status;

      if (
        typeof status !== 'string' ||
        !ALLOWED_AUTOMATION_TASK_STATUS_VALUES.includes(
          status as (
            typeof ALLOWED_AUTOMATION_TASK_STATUS_VALUES
          )[number],
        )
      ) {
        throw new BadRequestException(
          'Invalid task status trigger value',
        );
      }

      return {
        status,
      };
    }

    return {};
  }

  private validateActionConfig(
    actionType: string,
    actionConfig?: AutomationConfig,
  ): AutomationConfig {
    if (actionType === 'create_notification') {
      if (
        actionConfig === undefined ||
        actionConfig === null ||
        typeof actionConfig !== 'object' ||
        Array.isArray(actionConfig)
      ) {
        throw new BadRequestException(
          'Notification configuration is required',
        );
      }

      const title = actionConfig.title;
      const message = actionConfig.message;

      if (
        typeof title !== 'string' ||
        !title.trim()
      ) {
        throw new BadRequestException(
          'Notification title is required',
        );
      }

      if (
        typeof message !== 'string' ||
        !message.trim()
      ) {
        throw new BadRequestException(
          'Notification message is required',
        );
      }

      const trimmedTitle = title.trim();
      const trimmedMessage = message.trim();

      if (trimmedTitle.length > 150) {
        throw new BadRequestException(
          'Notification title must not exceed 150 characters',
        );
      }

      if (trimmedMessage.length > 1000) {
        throw new BadRequestException(
          'Notification message must not exceed 1000 characters',
        );
      }

      return {
        title: trimmedTitle,
        message: trimmedMessage,
      };
    }

    if (actionType === 'update_task_status') {
      if (
        actionConfig === undefined ||
        actionConfig === null ||
        typeof actionConfig !== 'object' ||
        Array.isArray(actionConfig)
      ) {
        throw new BadRequestException(
          'Task status action configuration is required',
        );
      }

      const status = actionConfig.status;

      if (
        typeof status !== 'string' ||
        !ALLOWED_AUTOMATION_TASK_STATUS_VALUES.includes(
          status as (
            typeof ALLOWED_AUTOMATION_TASK_STATUS_VALUES
          )[number],
        )
      ) {
        throw new BadRequestException(
          'Invalid task status action value',
        );
      }

      return {
        status,
      };
    }

    if (actionType === 'create_approval_request') {
      if (
        actionConfig === undefined ||
        actionConfig === null ||
        typeof actionConfig !== 'object' ||
        Array.isArray(actionConfig)
      ) {
        throw new BadRequestException(
          'Approval request configuration is required',
        );
      }

      const approverId = actionConfig.approver_id;

      if (
        typeof approverId !== 'string' ||
        !approverId.trim()
      ) {
        throw new BadRequestException(
          'Approver is required',
        );
      }

      return {
        approver_id: approverId.trim(),
      };
    }

    return {};
  }

  private validateTriggerType(triggerType: string) {
    if (
      !ALLOWED_TRIGGER_TYPES.includes(
        triggerType as (
          typeof ALLOWED_TRIGGER_TYPES
        )[number],
      )
    ) {
      throw new BadRequestException(
        'Invalid automation trigger type',
      );
    }
  }

  private validateActionType(actionType: string) {
    if (
      !ALLOWED_ACTION_TYPES.includes(
        actionType as (
          typeof ALLOWED_ACTION_TYPES
        )[number],
      )
    ) {
      throw new BadRequestException(
        'Invalid automation action type',
      );
    }
  }
}
