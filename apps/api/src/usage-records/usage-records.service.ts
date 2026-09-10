import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { Feature } from '../entities/features.entity';
import { Organization } from '../entities/organization.entity';
import { UsageRecord } from '../entities/usage-records.entity';

@Injectable()
export class UsageRecordsService {
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
        const usageRecordsRepository =
          manager.getRepository(UsageRecord);

        const usageRecord =
          await usageRecordsRepository.findOne({
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
        const usageRecordsRepository =
          manager.getRepository(UsageRecord);

        return usageRecordsRepository.find({
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
      },
    );
  }

  async create(
    currentUserId: string,
    organizationId: string,
    featureId: string,
    usage: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const organizationsRepository =
          manager.getRepository(Organization);

        const featuresRepository =
          manager.getRepository(Feature);

        const usageRecordsRepository =
          manager.getRepository(UsageRecord);

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

        const feature =
          await featuresRepository.findOne({
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
          await usageRecordsRepository.findOne({
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
          usageRecordsRepository.create({
            organization_id: organizationId,
            feature_id: featureId,
            usage,
            period_start: periodStart,
            period_end: periodEnd,
          });

        return usageRecordsRepository.save(
          usageRecord,
        );
      },
    );
  }

  async update(
    currentUserId: string,
    id: string,
    data: {
      usage?: string;
      period_start?: Date;
      period_end?: Date;
    },
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const usageRecordsRepository =
          manager.getRepository(UsageRecord);

        const usageRecord =
          await usageRecordsRepository.findOne({
            where: {
              id,
            },
          });

        if (!usageRecord) {
          throw new NotFoundException(
            'Usage record not found',
          );
        }

        Object.assign(usageRecord, data);

        return usageRecordsRepository.save(
          usageRecord,
        );
      },
    );
  }
}