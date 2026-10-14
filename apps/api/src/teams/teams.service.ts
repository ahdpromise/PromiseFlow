import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Team } from '../entities/team.entity';

type UpdateTeamPayload = {
  name?: string;
  slug?: string;
  description?: string | null;
};

@Injectable()
export class TeamsService {
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
          manager.getRepository(Team);

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
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Team);

        const team = repository.create({
          organization_id:
            organizationId,
          name,
          slug,
        });

        const savedTeam =
          await repository.save(team);

        const metadata = {
          name: savedTeam.name,
          slug: savedTeam.slug,
        };

        await this.auditLogsService.create(
          savedTeam.organization_id,
          userId,
          'created',
          'team',
          savedTeam.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          savedTeam.organization_id,
          'created',
          'team',
          savedTeam.id,
          metadata,
          manager,
        );

        return savedTeam;
      },
    );
  }

  async update(
    userId: string,
    teamId: string,
    payload: UpdateTeamPayload,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Team);

        const team =
          await repository.findOne({
            where: {
              id: teamId,
              deleted_at: IsNull(),
            },
          });

        if (!team) {
          throw new NotFoundException(
            'Team not found or inaccessible',
          );
        }

        if (payload.name !== undefined) {
          team.name = payload.name.trim();
        }

        if (payload.slug !== undefined) {
          team.slug = payload.slug.trim();
        }

        if (
          payload.description !== undefined
        ) {
          const description =
            payload.description?.trim();

          team.description =
            description || null;
        }

        team.updated_at = new Date();

        const savedTeam =
          await repository.save(team);

        const metadata = {
          name: savedTeam.name,
          slug: savedTeam.slug,
          description:
            savedTeam.description,
        };

        await this.auditLogsService.create(
          savedTeam.organization_id,
          userId,
          'updated',
          'team',
          savedTeam.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          savedTeam.organization_id,
          'updated',
          'team',
          savedTeam.id,
          metadata,
          manager,
        );

        return savedTeam;
      },
    );
  }

  async remove(
    userId: string,
    teamId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository =
          manager.getRepository(Team);

        const team =
          await repository.findOne({
            where: {
              id: teamId,
              deleted_at: IsNull(),
            },
          });

        if (!team) {
          throw new NotFoundException(
            'Team not found or inaccessible',
          );
        }

        const metadata = {
          name: team.name,
          slug: team.slug,
          description: team.description,
        };

        const result: Array<{
          soft_delete_team: boolean;
        }> = await manager.query(
          `
            SELECT public.soft_delete_team($1)
              AS soft_delete_team
          `,
          [teamId],
        );

        const wasDeleted =
          result[0]?.soft_delete_team ===
          true;

        if (!wasDeleted) {
          throw new NotFoundException(
            'Team not found or inaccessible',
          );
        }

        await this.auditLogsService.create(
          team.organization_id,
          userId,
          'deleted',
          'team',
          team.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          userId,
          team.organization_id,
          'deleted',
          'team',
          team.id,
          metadata,
          manager,
        );

        return {
          id: teamId,
          deleted: true,
        };
      },
    );
  }
}