import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../entities/roles.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async findAll(organizationId: string) {
    return this.rolesRepository.find({
      where: {
        organization_id: organizationId,
      },
    });
  }

  async create(
    organizationId: string,
    name: string,
    slug: string,
    description?: string,
  ) {
    const role = this.rolesRepository.create({
      organization_id: organizationId,
      name,
      slug,
      description: description ?? null,
    });

    return this.rolesRepository.save(role);
  }
}