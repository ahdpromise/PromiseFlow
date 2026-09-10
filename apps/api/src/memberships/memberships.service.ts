import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Membership } from '../entities/membership.entity';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(userId: string) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Membership);

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

  async findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Membership);

        return repository.findOne({
          where: {
            user_id: userId,
            organization_id: organizationId,
            deleted_at: IsNull(),
          },
        });
      },
    );
  }

  async create(
    userId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Membership);

        const membership = repository.create({
          user_id: userId,
          organization_id: organizationId,
        });

        return repository.save(membership);
      },
    );
  }
}