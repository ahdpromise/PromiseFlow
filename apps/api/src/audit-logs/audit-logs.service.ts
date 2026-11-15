
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { AuditLog } from '../entities/audit-log.entity';

export type AuditLogFilters = {
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
export class AuditLogsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    organizationId?: string,
    filters: AuditLogFilters = {},
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const queryBuilder = manager
          .getRepository(AuditLog)
          .createQueryBuilder('auditLog');

        if (organizationId) {
          queryBuilder.where(
            'auditLog.organization_id = :organizationId',
            {
              organizationId,
            },
          );
        }

        if (filters.action) {
          queryBuilder.andWhere(
            'auditLog.action = :action',
            {
              action: filters.action,
            },
          );
        }

        if (filters.userId) {
          queryBuilder.andWhere(
            'auditLog.user_id = :userId',
            {
              userId: filters.userId,
            },
          );
        }

        if (filters.entityType) {
          queryBuilder.andWhere(
            'auditLog.entity_type = :entityType',
            {
              entityType: filters.entityType,
            },
          );
        }

        if (filters.from) {
          queryBuilder.andWhere(
            'auditLog.created_at >= CAST(:from AS date)',
            {
              from: filters.from,
            },
          );
        }

        if (filters.to) {
          queryBuilder.andWhere(
            "auditLog.created_at < CAST(:to AS date) + INTERVAL '1 day'",
            {
              to: filters.to,
            },
          );
        }

        const search = filters.search?.trim();

        if (search) {
          queryBuilder.andWhere(
            `(
              auditLog.action ILIKE :search
              OR auditLog.entity_type ILIKE :search
              OR CAST(auditLog.entity_id AS text) ILIKE :search
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
          .orderBy('auditLog.created_at', 'DESC')
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
    organizationId: string,
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    manager?: EntityManager,
  ): Promise<{ id: string }> {
    if (!manager) {
      throw new Error(
        'Audit log creation requires an active transaction manager',
      );
    }

    const result: Array<{ id: string }> =
      await manager.query(
        `
          SELECT public.create_audit_log(
            $1::uuid,
            $2::uuid,
            $3::text,
            $4::text,
            $5::uuid,
            $6::jsonb,
            $7::inet,
            $8::text
          ) AS id
        `,
        [
          organizationId,
          userId,
          action,
          entityType,
          entityId,
          metadata ? JSON.stringify(metadata) : null,
          ipAddress ?? null,
          userAgent ?? null,
        ],
      );

    if (!result[0]?.id) {
      throw new Error(
        'Audit log creation did not return an ID',
      );
    }

    return { id: result[0].id };
  }
}
