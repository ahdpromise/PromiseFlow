import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Project } from '../entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  async findAll(organizationId: string) {
    return this.projectsRepository.find({
      where: {
        organization_id: organizationId,
        deleted_at: IsNull(),
      },
    });
  }

  async create(
    organizationId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    const project = this.projectsRepository.create({
      organization_id: organizationId,
      name,
      slug,
      description: description ?? null,
    });

    return this.projectsRepository.save(project);
  }
}