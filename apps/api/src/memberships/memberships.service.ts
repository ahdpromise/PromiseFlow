import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Membership } from '../entities/membership.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly membershipsRepository: Repository<Membership>,
  ) {}

  async findAll() {
    return this.membershipsRepository.find();
  }

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ) {
    return this.membershipsRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        deleted_at: IsNull(),
      },
    });
  }

  async create(user_id: string, organization_id: string) {
    const membership = this.membershipsRepository.create({
      user_id,
      organization_id,
    });

    return this.membershipsRepository.save(membership);
  }
}