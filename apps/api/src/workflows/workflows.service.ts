import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';
import { Workflow } from '../entities/workflow.entity';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    projectId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Workflow);

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
    currentUserId: string,
    projectId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const project =
          await manager.getRepository(Project).findOne({
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

        const repository =
          manager.getRepository(Workflow);

        const workflow = repository.create({
          project_id: projectId,
          name,
          slug,
          description: description ?? null,
        });

        const savedWorkflow =
          await repository.save(workflow);

        const metadata = {
          name: savedWorkflow.name,
          slug: savedWorkflow.slug,
          projectId: savedWorkflow.project_id,
          description: savedWorkflow.description,
        };

        await this.auditLogsService.create(
          project.organization_id,
          currentUserId,
          'created',
          'workflow',
          savedWorkflow.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          currentUserId,
          project.organization_id,
          'created',
          'workflow',
          savedWorkflow.id,
          metadata,
          manager,
        );

        return savedWorkflow;
      },
    );
  }

  async update(
    currentUserId: string,
    workflowId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
    },
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Workflow);

        const workflow =
          await repository.findOne({
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

        const project =
          await manager.getRepository(Project).findOne({
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

        if (data.name !== undefined) {
          workflow.name = data.name;
        }

        if (data.slug !== undefined) {
          workflow.slug = data.slug;
        }

        if (data.description !== undefined) {
          workflow.description = data.description;
        }

        workflow.updated_at = new Date();

        const savedWorkflow =
          await repository.save(workflow);

        const metadata = {
          name: savedWorkflow.name,
          slug: savedWorkflow.slug,
          projectId: savedWorkflow.project_id,
          description: savedWorkflow.description,
        };

        await this.auditLogsService.create(
          project.organization_id,
          currentUserId,
          'updated',
          'workflow',
          savedWorkflow.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          currentUserId,
          project.organization_id,
          'updated',
          'workflow',
          savedWorkflow.id,
          metadata,
          manager,
        );

        return savedWorkflow;
      },
    );
  }

  async remove(
    currentUserId: string,
    workflowId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Workflow);

        const workflow =
          await repository.findOne({
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

        const project =
          await manager.getRepository(Project).findOne({
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

        const metadata = {
          name: workflow.name,
          slug: workflow.slug,
          projectId: workflow.project_id,
          description: workflow.description,
        };

        const result: Array<{
          deleted: boolean;
        }> = await manager.query(
          `
            SELECT public.soft_delete_workflow(
              $1::uuid
            ) AS deleted
          `,
          [workflowId],
        );

        const deleted =
          result?.[0]?.deleted === true;

        if (!deleted) {
          throw new NotFoundException(
            'Workflow not found or inaccessible',
          );
        }

        await this.auditLogsService.create(
          project.organization_id,
          currentUserId,
          'deleted',
          'workflow',
          workflow.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          currentUserId,
          project.organization_id,
          'deleted',
          'workflow',
          workflow.id,
          metadata,
          manager,
        );

        return {
          success: true,
        };
      },
    );
  }
}