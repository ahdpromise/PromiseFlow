import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Feature } from '../entities/features.entity';
import { Organization } from '../entities/organization.entity';
import { UsageRecord } from '../entities/usage-records.entity';

@Injectable()
export class UsageRecordsService {
  constructor(
    @InjectRepository(UsageRecord)
    private readonly usageRecordsRepository: Repository<UsageRecord>,

    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,

    @InjectRepository(Feature)
    private readonly featuresRepository: Repository<Feature>,
  ) {}

  async findById(id: string) {
    const usageRecord =
      await this.usageRecordsRepository.findOne({
        where: {
          id,
        },
        relations: {
          organization: true,
          feature: true,
        },
      });

    if (!usageRecord) {
      throw new NotFoundException(
        'Usage record not found',
      );
    }

    return usageRecord;
  }

  async findByOrganizationId(
    organizationId: string,
  ) {
    return this.usageRecordsRepository.find({
      where: {
        organization_id: organizationId,
      },
      relations: {
        feature: true,
      },
      order: {
        period_start: 'DESC',
        created_at: 'DESC',
      },
    });
  }

  async create(
    organizationId: string,
    featureId: string,
    usage: string,
    periodStart: Date,
    periodEnd: Date,
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

    const feature =
      await this.featuresRepository.findOne({
        where: {
          id: featureId,
          is_active: true,
        },
      });

    if (!feature) {
      throw new NotFoundException(
        'Active feature not found',
      );
    }

    const existing =
      await this.usageRecordsRepository.findOne({
        where: {
          organization_id: organizationId,
          feature_id: featureId,
          period_start: periodStart,
          period_end: periodEnd,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Usage record already exists for this organization, feature, and period',
      );
    }

    const usageRecord =
      this.usageRecordsRepository.create({
        organization_id: organizationId,
        feature_id: featureId,
        usage,
        period_start: periodStart,
        period_end: periodEnd,
      });

    return this.usageRecordsRepository.save(
      usageRecord,
    );
  }

  async update(
    id: string,
    data: {
      usage?: string;
      period_start?: Date;
      period_end?: Date;
    },
  ) {
    const usageRecord = await this.findById(id);

    Object.assign(usageRecord, data);

    return this.usageRecordsRepository.save(
      usageRecord,
    );
  }
}