import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ProjectMember } from '../entities/project-member.entity';

@Injectable()
export class ProjectMembersService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMembersRepository: Repository<ProjectMember>,
  ) {}

  async findAll() {
    return this.projectMembersRepository.find({
      where: {
        deleted_at: IsNull(),
      },
    });
  }

  async create(projectId: string, userId: string) {
    const projectMember = this.projectMembersRepository.create({
      project_id: projectId,
      user_id: userId,
    });

    return this.projectMembersRepository.save(projectMember);
  }
}