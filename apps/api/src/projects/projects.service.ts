
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';
import { OrganizationAccessService } from '../memberships/organization-access.service';

type SubscriptionLimitResult = {
  status: string;
  current_period_start: Date | string;
  current_period_end: Date | string;
  plan_is_active: boolean;
  feature_is_active: boolean | null;
  value_type: string | null;
  max_projects_limit: string | null;
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
    private readonly organizationAccessService: OrganizationAccessService,
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
            organization_id: organizationId,
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
        await this.organizationAccessService.assertPermission(
          manager,
          userId,
          organizationId,
          'projects.create',
        );

        // Serialize project creation within this organization.
        // The lock is released automatically at transaction end.
        await manager.query(
          `
            SELECT pg_advisory_xact_lock(
              hashtextextended($1::text, 0)
            )
          `,
          [organizationId],
        );

        const limit =
          await this.getProjectLimit(
            manager,
            organizationId,
          );

        const repository =
          manager.getRepository(Project);

        if (limit !== null) {
          const activeProjectCount =
            await repository.count({
              where: {
                organization_id: organizationId,
                deleted_at: IsNull(),
              },
            });

          if (activeProjectCount >= limit) {
            throw new ForbiddenException(
              `Project limit reached. Your plan allows up to ${limit} active projects.`,
            );
          }
        }

        const project =
          repository.create({
            organization_id: organizationId,
            name,
            slug,
            description: description ?? null,
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

  private async getProjectLimit(
    manager: EntityManager,
    organizationId: string,
  ): Promise<number | null> {
    const subscriptions: SubscriptionLimitResult[] =
      await manager.query(
        `
          SELECT
            s.status,
            s.current_period_start,
            s.current_period_end,
            p.is_active AS plan_is_active,
            f.is_active AS feature_is_active,
            f.value_type,
            pf.value AS max_projects_limit
          FROM public.subscriptions s
          JOIN public.plans p
            ON p.id = s.plan_id
          LEFT JOIN public.features f
            ON f.slug = 'max_projects'
          LEFT JOIN public.plan_features pf
            ON pf.plan_id = p.id
           AND pf.feature_id = f.id
          WHERE s.organization_id = $1
        `,
        [organizationId],
      );

    // Preserve existing behavior for organizations
    // without a configured subscription.
    if (subscriptions.length === 0) {
      return null;
    }

    if (subscriptions.length !== 1) {
      throw new InternalServerErrorException(
        'Invalid subscription configuration',
      );
    }

    const subscription = subscriptions[0];

    const allowedStatuses = [
      'active',
      'trialing',
    ];

    const now = new Date();

    const periodStart = new Date(
      subscription.current_period_start,
    );

    const periodEnd = new Date(
      subscription.current_period_end,
    );

    if (
      !allowedStatuses.includes(subscription.status) ||
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime()) ||
      periodStart > now ||
      periodEnd <= now ||
      subscription.plan_is_active !== true
    ) {
      throw new ForbiddenException(
        'An active subscription is required to create projects.',
      );
    }

    // A plan without an active max_projects feature
    // retains the existing unlimited behavior.
    if (
      subscription.feature_is_active !== true ||
      subscription.max_projects_limit === null
    ) {
      return null;
    }

    if (subscription.value_type !== 'number') {
      throw new InternalServerErrorException(
        'Invalid max_projects feature configuration',
      );
    }

    const limit = Number(
      subscription.max_projects_limit,
    );

    if (
      !Number.isSafeInteger(limit) ||
      limit < 0
    ) {
      throw new InternalServerErrorException(
        'Invalid max_projects limit configuration',
      );
    }

    return limit;
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
        project.updated_at = new Date();

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
          result[0]?.soft_delete_project === true;

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
