import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { Organization } from '../entities/organization.entity';
import { Plan } from '../entities/plans.entity';
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
    currentUserId: string,
    organizationId: string,
    planId: string,
    status: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd = false,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const organizationsRepository =
          manager.getRepository(Organization);

        const plansRepository =
          manager.getRepository(Plan);

        const subscriptionsRepository =
          manager.getRepository(Subscription);

        const organization =
          await organizationsRepository.findOne({
            where: {
              id: organizationId,
            },
          });

        if (!organization) {
          throw new NotFoundException(
            'Organization not found',
          );
        }

        const plan =
          await plansRepository.findOne({
            where: {
              id: planId,
              is_active: true,
            },
          });

        if (!plan) {
          throw new NotFoundException(
            'Active plan not found',
          );
        }

        const existingSubscription =
          await subscriptionsRepository.findOne({
            where: {
              organization_id: organizationId,
            },
          });

        if (existingSubscription) {
          throw new ConflictException(
            'Organization already has a subscription',
          );
        }

        const subscription =
          subscriptionsRepository.create({
            organization_id: organizationId,
            plan_id: planId,
            status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            canceled_at: null,
          });

        return subscriptionsRepository.save(
          subscription,
        );
      },
    );
  }

  async update(
    currentUserId: string,
    id: string,
    data: {
      status?: string;
      current_period_start?: Date;
      current_period_end?: Date;
      cancel_at_period_end?: boolean;
      canceled_at?: Date | null;
    },
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
          });

        if (!subscription) {
          throw new NotFoundException(
            'Subscription not found',
          );
        }

        Object.assign(subscription, data);

        return subscriptionsRepository.save(
          subscription,
        );
      },
    );
  }
}