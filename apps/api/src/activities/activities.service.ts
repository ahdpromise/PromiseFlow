import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Activity } from '../entities/activity.entity';

export type ActivityFilters = {
  action?: string;
  userId?: string;
  entityType?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
};

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    organizationId: string,
    filters: ActivityFilters = {},
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Activity);

        const queryBuilder = repository
          .createQueryBuilder('activity')
          .where(
            'activity.organization_id = :organizationId',
            {
              organizationId,
            },
          );

        if (filters.action) {
          queryBuilder.andWhere(
            'activity.action = :action',
            {
              action: filters.action,
            },
          );
        }

        if (filters.userId) {
          queryBuilder.andWhere(
            'activity.user_id = :userId',
            {
              userId: filters.userId,
            },
          );
        }

        if (filters.entityType) {
          queryBuilder.andWhere(
            'activity.entity_type = :entityType',
            {
              entityType: filters.entityType,
            },
          );
        }

        if (filters.from) {
          queryBuilder.andWhere(
            'activity.created_at >= CAST(:from AS date)',
            {
              from: filters.from,
            },
          );
        }

        if (filters.to) {
          queryBuilder.andWhere(
            "activity.created_at < CAST(:to AS date) + INTERVAL '1 day'",
            {
              to: filters.to,
            },
          );
        }

        const search = filters.search?.trim();

        if (search) {
          queryBuilder.andWhere(
            `(
              activity.action ILIKE :search
              OR activity.entity_type ILIKE :search
              OR CAST(activity.entity_id AS text) ILIKE :search
            )`,
            {
              search: `%${search}%`,
            },
          );
        }

        const requestedPage = Number(filters.page);
        const requestedLimit = Number(filters.limit);

        const page =
          Number.isSafeInteger(requestedPage) &&
          requestedPage > 0
            ? requestedPage
            : 1;

        const limit =
          Number.isSafeInteger(requestedLimit) &&
          requestedLimit > 0
            ? Math.min(requestedLimit, 100)
            : 20;

        const skip = (page - 1) * limit;

        const [data, total] = await queryBuilder
          .orderBy('activity.created_at', 'DESC')
          .addOrderBy('activity.id', 'DESC')
          .skip(skip)
          .take(limit)
          .getManyAndCount();

        return {
          data,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1,
          },
        };
      },
    );
  }

  async create(
    currentUserId: string,
    organizationId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    manager?: EntityManager,
  ) {
    const createActivity = async (
      entityManager: EntityManager,
    ) => {
      const result: Array<{
        activity_id: string;
      }> = await entityManager.query(
        `
          SELECT
            public.create_activity(
              $1,
              $2,
              $3,
              $4,
              $5::jsonb
            ) AS activity_id
        `,
        [
          organizationId,
          action,
          entityType,
          entityId,
          JSON.stringify(metadata ?? null),
        ],
      );

      return result[0];
    };

    if (manager) {
      return createActivity(manager);
    }

    return this.rlsContextService.run(
      currentUserId,
      createActivity,
    );
  }
}