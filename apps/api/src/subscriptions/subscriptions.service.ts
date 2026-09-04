import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from '../entities/organization.entity';
import { Plan } from '../entities/plans.entity';
import { Subscription } from '../entities/subscriptions.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,

    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,

    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
  ) {}

  async findById(id: string) {
    const subscription =
      await this.subscriptionsRepository.findOne({
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
  }

  async findByOrganizationId(
    organizationId: string,
  ) {
    const subscription =
      await this.subscriptionsRepository.findOne({
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
  }

  async create(
    organizationId: string,
    planId: string,
    status: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd = false,
  ) {
    const organization =
      await this.organizationsRepository.findOne({
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
      await this.plansRepository.findOne({
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
      await this.subscriptionsRepository.findOne({
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
      this.subscriptionsRepository.create({
        organization_id: organizationId,
        plan_id: planId,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
      });

    return this.subscriptionsRepository.save(
      subscription,
    );
  }

  async update(
    id: string,
    data: {
      status?: string;
      current_period_start?: Date;
      current_period_end?: Date;
      cancel_at_period_end?: boolean;
      canceled_at?: Date | null;
    },
  ) {
    const subscription = await this.findById(id);

    Object.assign(subscription, data);

    return this.subscriptionsRepository.save(
      subscription,
    );
  }
}