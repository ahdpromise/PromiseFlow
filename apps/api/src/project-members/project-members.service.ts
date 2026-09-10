import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { ProjectMember } from '../entities/project-member.entity';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(ProjectMember);

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
    projectId: string,
    memberUserId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(ProjectMember);

        const projectMember = repository.create({
          project_id: projectId,
          user_id: memberUserId,
        });

        return repository.save(projectMember);
      },
    );
  }
}