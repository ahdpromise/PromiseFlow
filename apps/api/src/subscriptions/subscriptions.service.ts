
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { Subscription } from '../entities/subscriptions.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findById(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const subscriptionsRepository =
          manager.getRepository(Subscription);

        const subscription =
          await subscriptionsRepository.findOne({
            where: {
              id,
            },
            relations: {
              organization: true,
              plan: true,
            },
          });

        if (!subscription) {
          throw new NotFoundException(
            'Subscription not found',
          );
        }

        return subscription;
      },
    );
  }

  async findByOrganizationId(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const subscriptionsRepository =
          manager.getRepository(Subscription);

        const subscription =
          await subscriptionsRepository.findOne({
            where: {
              organization_id: organizationId,
            },
            relations: {
              organization: true,
              plan: true,
            },
          });

        if (!subscription) {
          throw new NotFoundException(
            'Subscription not found',
          );
        }

        return subscription;
      },
    );
  }

  async create(
    _currentUserId: string,
    _organizationId: string,
    _planId: string,
    _status: string,
    _currentPeriodStart: Date,
    _currentPeriodEnd: Date,
    _cancelAtPeriodEnd = false,
  ): Promise<never> {
    throw new ForbiddenException(
      'Subscription creation is disabled through the application service.',
    );
  }

  async update(
    _currentUserId: string,
    _id: string,
    _data: {
      status?: string;
      current_period_start?: Date;
      current_period_end?: Date;
      cancel_at_period_end?: boolean;
      canceled_at?: Date | null;
    },
  ): Promise<never> {
    throw new ForbiddenException(
      'Subscription updates are disabled through the application service.',
    );
  }
}
