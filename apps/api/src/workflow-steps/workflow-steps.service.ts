import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';
import { WorkflowStep } from '../entities/workflow-step.entity';
import { Workflow } from '../entities/workflow.entity';

@Injectable()
export class WorkflowStepsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
  ) {}

  private async getWorkflowContext(
    manager: Parameters<
      Parameters<RlsContextService['run']>[1]
    >[0],
    workflowId: string,
  ) {
    const workflow = await manager
      .getRepository(Workflow)
      .findOne({
        where: {
          id: workflowId,
          deleted_at: IsNull(),
        },
      });

    if (!workflow) {
      throw new NotFoundException(
        'Workflow not found or inaccessible',
      );
    }

    const project = await manager
      .getRepository(Project)
      .findOne({
        where: {
          id: workflow.project_id,
          deleted_at: IsNull(),
        },
      });

    if (!project) {
      throw new NotFoundException(
        'Project not found or inaccessible',
      );
    }

    return {
      workflow,
      organizationId: project.organization_id,
    };
  }

  private async recordActivity(
    manager: Parameters<
      Parameters<RlsContextService['run']>[1]
    >[0],
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
      'workflow_step',
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
      'workflow_step',
      entityId,
      metadata,
      manager,
    );
  }

  async findAll(
    currentUserId: string,
    workflowId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(WorkflowStep);

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
        const { organizationId } =
          await this.getWorkflowContext(
            manager,
            workflowId,
          );

        const repository =
          manager.getRepository(WorkflowStep);

        const workflowStep =
          repository.create({
            workflow_id: workflowId,
            name,
            slug,
            step_type: stepType,
            position,
            description: description ?? null,
          });

        const savedStep =
          await repository.save(workflowStep);

        await this.recordActivity(
          manager,
          currentUserId,
          organizationId,
          'created',
          savedStep.id,
          {
            name: savedStep.name,
            slug: savedStep.slug,
            workflowId: savedStep.workflow_id,
            stepType: savedStep.step_type,
            position: savedStep.position,
            description: savedStep.description,
          },
        );

        return savedStep;
      },
    );
  }

  async update(
    currentUserId: string,
    workflowStepId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      step_type?: string;
    },
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(WorkflowStep);

        const workflowStep =
          await repository.findOne({
            where: {
              id: workflowStepId,
              deleted_at: IsNull(),
            },
          });

        if (!workflowStep) {
          throw new NotFoundException(
            'Workflow step not found or inaccessible',
          );
        }

        const { organizationId } =
          await this.getWorkflowContext(
            manager,
            workflowStep.workflow_id,
          );

        if (data.name !== undefined) {
          workflowStep.name = data.name;
        }

        if (data.slug !== undefined) {
          workflowStep.slug = data.slug;
        }

        if (data.description !== undefined) {
          workflowStep.description =
            data.description;
        }

        if (data.step_type !== undefined) {
          workflowStep.step_type =
            data.step_type;
        }

        workflowStep.updated_at = new Date();

        const savedStep =
          await repository.save(workflowStep);

        await this.recordActivity(
          manager,
          currentUserId,
          organizationId,
          'updated',
          savedStep.id,
          {
            name: savedStep.name,
            slug: savedStep.slug,
            workflowId: savedStep.workflow_id,
            stepType: savedStep.step_type,
            position: savedStep.position,
            description: savedStep.description,
          },
        );

        return savedStep;
      },
    );
  }

  async reorder(
    currentUserId: string,
    workflowId: string,
    stepIds: string[],
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        if (
          !workflowId ||
          !Array.isArray(stepIds)
        ) {
          throw new BadRequestException(
            'Workflow ID and step IDs are required',
          );
        }

        const repository =
          manager.getRepository(WorkflowStep);

        const currentSteps =
          await repository.find({
            where: {
              workflow_id: workflowId,
              deleted_at: IsNull(),
            },
            order: {
              position: 'ASC',
            },
          });

        if (currentSteps.length !== stepIds.length) {
          throw new BadRequestException(
            'Step list does not match the active workflow steps',
          );
        }

        const currentIds = new Set(
          currentSteps.map((step) => step.id),
        );

        const requestedIds = new Set(stepIds);

        if (
          requestedIds.size !== stepIds.length ||
          stepIds.some(
            (stepId) => !currentIds.has(stepId),
          )
        ) {
          throw new BadRequestException(
            'Invalid workflow step order',
          );
        }

        const { organizationId } =
          await this.getWorkflowContext(
            manager,
            workflowId,
          );

        const previousOrder =
          currentSteps.map((step) => step.id);

        const orderChanged = stepIds.some(
          (stepId, index) =>
            previousOrder[index] !== stepId,
        );

        for (
          let position = 0;
          position < stepIds.length;
          position += 1
        ) {
          const stepId = stepIds[position];

          await repository.update(
            {
              id: stepId,
              workflow_id: workflowId,
              deleted_at: IsNull(),
            },
            {
              position,
              updated_at: new Date(),
            },
          );
        }

        const reorderedSteps =
          await repository.find({
            where: {
              workflow_id: workflowId,
              deleted_at: IsNull(),
            },
            order: {
              position: 'ASC',
            },
          });

        if (orderChanged) {
          await this.recordActivity(
            manager,
            currentUserId,
            organizationId,
            'reordered',
            workflowId,
            {
              workflowId,
              previousOrder,
              newOrder: stepIds,
            },
          );
        }

        return reorderedSteps;
      },
    );
  }

  async remove(
    currentUserId: string,
    workflowStepId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(WorkflowStep);

        const workflowStep =
          await repository.findOne({
            where: {
              id: workflowStepId,
              deleted_at: IsNull(),
            },
          });

        if (!workflowStep) {
          throw new NotFoundException(
            'Workflow step not found or inaccessible',
          );
        }

        const { organizationId } =
          await this.getWorkflowContext(
            manager,
            workflowStep.workflow_id,
          );

        const metadata = {
          name: workflowStep.name,
          slug: workflowStep.slug,
          workflowId: workflowStep.workflow_id,
          stepType: workflowStep.step_type,
          position: workflowStep.position,
          description: workflowStep.description,
        };

        const result: Array<{
          deleted: boolean;
        }> = await manager.query(
          `
            SELECT public.soft_delete_workflow_step(
              $1::uuid
            ) AS deleted
          `,
          [workflowStepId],
        );

        const deleted =
          result?.[0]?.deleted === true;

        if (!deleted) {
          throw new NotFoundException(
            'Workflow step not found or inaccessible',
          );
        }

        await this.recordActivity(
          manager,
          currentUserId,
          organizationId,
          'deleted',
          workflowStep.id,
          metadata,
        );

        return {
          success: true,
        };
      },
    );
  }
}