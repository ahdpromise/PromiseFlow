import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { TeamMember } from '../entities/team-member.entity';

@Injectable()
export class TeamMembersService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(TeamMember);

        return repository.find({
          where: {
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
        const repository = manager.getRepository(TeamMember);

        const teamMember = repository.create({
          team_id: teamId,
          user_id: memberUserId,
        });

        return repository.save(teamMember);
      },
    );
  }
}