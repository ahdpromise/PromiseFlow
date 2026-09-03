import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  async findAll() {
    return this.organizationsRepository.find();
  }

  async create(name: string, slug: string) {
    const organization = this.organizationsRepository.create({
      name,
      slug,
    });

    return this.organizationsRepository.save(organization);
  }
}