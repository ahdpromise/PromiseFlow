import { Injectable } from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { Activity } from '../entities/activity.entity';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Activity);

        return repository.find({
          where: {
            organization_id: organizationId,
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }
}