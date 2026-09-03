import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PlanFeature } from '../entities/plan-features.entity';

@Injectable()
export class PlanFeaturesService {
  constructor(
    @InjectRepository(PlanFeature)
    private readonly planFeaturesRepository: Repository<PlanFeature>,
  ) {}

  async findAllByPlan(planId: string) {
    return this.planFeaturesRepository.find({
      where: {
        plan_id: planId,
      },
      relations: {
        feature: true,
      },
      order: {
        created_at: 'ASC',
      },
    });
  }

  async findOne(planId: string, featureId: string) {
    const planFeature = await this.planFeaturesRepository.findOne({
      where: {
        plan_id: planId,
        feature_id: featureId,
      },
      relations: {
        plan: true,
        feature: true,
      },
    });

    if (!planFeature) {
      throw new NotFoundException(
        'Plan feature not found',
      );
    }

    return planFeature;
  }

  async create(
    planId: string,
    featureId: string,
    value: string,
  ) {
    const existing =
      await this.planFeaturesRepository.findOne({
        where: {
          plan_id: planId,
          feature_id: featureId,
        },
      });

    if (existing) {
      throw new ConflictException(
        'This feature is already assigned to this plan',
      );
    }

    const planFeature =
      this.planFeaturesRepository.create({
        plan_id: planId,
        feature_id: featureId,
        value,
      });

    return this.planFeaturesRepository.save(
      planFeature,
    );
  }

  async updateValue(
    planId: string,
    featureId: string,
    value: string,
  ) {
    const planFeature =
      await this.findOne(planId, featureId);

    planFeature.value = value;

    return this.planFeaturesRepository.save(
      planFeature,
    );
  }

  async remove(
    planId: string,
    featureId: string,
  ) {
    const planFeature =
      await this.findOne(planId, featureId);

    await this.planFeaturesRepository.remove(
      planFeature,
    );

    return {
      message: 'Plan feature removed successfully',
    };
  }
}