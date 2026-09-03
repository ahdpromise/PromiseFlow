import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Activity } from '../entities/activity.entity';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
  ) {}

  async findAll(userId: string) {
    return this.activitiesRepository.find({
      where: {
        user_id: userId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async create(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    const activity = this.activitiesRepository.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
    });

    return this.activitiesRepository.save(activity);
  }
}