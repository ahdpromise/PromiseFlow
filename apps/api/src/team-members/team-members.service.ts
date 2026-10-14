import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { TeamMember } from '../entities/team-member.entity';
import { Team } from '../entities/team.entity';

@Injectable()
export class TeamMembersService {
  constructor(
    private readonly rlsContextService: RlsContextService,
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    currentUserId: string,
    teamId?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(TeamMember);

        return repository.find({
          where: {
            ...(teamId
              ? {
                  team_id: teamId,
                }
              : {}),
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
    teamId: string,
    memberUserId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(TeamMember);

        const team = await manager
          .getRepository(Team)
          .findOne({
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

        const restoreResult: Array<{
          restore_team_member: boolean;
        }> = await manager.query(
          `
            SELECT public.restore_team_member($1, $2)
              AS restore_team_member
          `,
          [teamId, memberUserId],
        );

        const wasRestored =
          restoreResult[0]
            ?.restore_team_member === true;

        let savedMember: TeamMember;

        if (wasRestored) {
          const restoredMember =
            await repository.findOne({
              where: {
                team_id: teamId,
                user_id: memberUserId,
                deleted_at: IsNull(),
              },
            });

          if (!restoredMember) {
            throw new NotFoundException(
              'Restored team member not found or inaccessible',
            );
          }

          savedMember = restoredMember;
        } else {
          const teamMember =
            repository.create({
              team_id: teamId,
              user_id: memberUserId,
            });

          savedMember =
            await repository.save(teamMember);
        }

        const metadata = {
          team_id: teamId,
          member_user_id: memberUserId,
          restored: wasRestored,
        };

        await this.auditLogsService.create(
          team.organization_id,
          currentUserId,
          'added',
          'team_member',
          savedMember.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          currentUserId,
          team.organization_id,
          'added',
          'team_member',
          savedMember.id,
          metadata,
          manager,
        );

        return savedMember;
      },
    );
  }

  async remove(
    currentUserId: string,
    teamMemberId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(TeamMember);

        const teamMember =
          await repository.findOne({
            where: {
              id: teamMemberId,
              deleted_at: IsNull(),
            },
          });

        if (!teamMember) {
          throw new NotFoundException(
            'Team member not found or inaccessible',
          );
        }

        const team = await manager
          .getRepository(Team)
          .findOne({
            where: {
              id: teamMember.team_id,
              deleted_at: IsNull(),
            },
          });

        if (!team) {
          throw new NotFoundException(
            'Team not found or inaccessible',
          );
        }

        const result: Array<{
          soft_delete_team_member: boolean;
        }> = await manager.query(
          `
            SELECT public.soft_delete_team_member($1)
              AS soft_delete_team_member
          `,
          [teamMemberId],
        );

        const wasDeleted =
          result[0]
            ?.soft_delete_team_member === true;

        if (!wasDeleted) {
          throw new NotFoundException(
            'Team member not found or inaccessible',
          );
        }

        const metadata = {
          team_id: teamMember.team_id,
          member_user_id: teamMember.user_id,
        };

        await this.auditLogsService.create(
          team.organization_id,
          currentUserId,
          'removed',
          'team_member',
          teamMember.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        await this.activitiesService.create(
          currentUserId,
          team.organization_id,
          'removed',
          'team_member',
          teamMember.id,
          metadata,
          manager,
        );

        return {
          id: teamMemberId,
          deleted: true,
        };
      },
    );
  }
}