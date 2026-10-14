import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    userId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Project);

        return repository.find({
          where: {
            organization_id:
              organizationId,
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
    organizationId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Project);

        const project =
          repository.create({
            organization_id:
              organizationId,
            name,
            slug,
            description:
              description ?? null,
          });

        const savedProject =
          await repository.save(project);

        await this.auditLogsService.create(
          organizationId,
          userId,
          'created',
          'project',
          savedProject.id,
          {
            name: savedProject.name,
            slug: savedProject.slug,
          },
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          organizationId,
          'created',
          'project',
          savedProject.id,
          {
            name: savedProject.name,
            slug: savedProject.slug,
          },
          manager,
        );

        return savedProject;
      },
    );
  }

  async update(
    userId: string,
    projectId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Project);

        const project =
          await repository.findOne({
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

        project.name = name;
        project.slug = slug;
        project.description =
          description ?? null;
        project.updated_at =
          new Date();

        const savedProject =
          await repository.save(project);

        await this.auditLogsService.create(
          savedProject.organization_id,
          userId,
          'updated',
          'project',
          savedProject.id,
          {
            name: savedProject.name,
            slug: savedProject.slug,
          },
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          savedProject.organization_id,
          'updated',
          'project',
          savedProject.id,
          {
            name: savedProject.name,
            slug: savedProject.slug,
          },
          manager,
        );

        return savedProject;
      },
    );
  }

  async remove(
    userId: string,
    projectId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Project);

        const project =
          await repository.findOne({
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

        const result: Array<{
          soft_delete_project: boolean;
        }> = await manager.query(
          `
            SELECT public.soft_delete_project($1)
              AS soft_delete_project
          `,
          [projectId],
        );

        const wasDeleted =
          result[0]?.soft_delete_project ===
          true;

        if (!wasDeleted) {
          throw new NotFoundException(
            'Project not found or inaccessible',
          );
        }

        await this.auditLogsService.create(
          project.organization_id,
          userId,
          'deleted',
          'project',
          project.id,
          {
            name: project.name,
            slug: project.slug,
          },
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          project.organization_id,
          'deleted',
          'project',
          project.id,
          {
            name: project.name,
            slug: project.slug,
          },
          manager,
        );

        return {
          id: projectId,
          deleted: true,
        };
      },
    );
  }
}