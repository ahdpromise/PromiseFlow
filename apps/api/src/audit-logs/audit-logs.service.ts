import {
  Injectable,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        return manager
          .getRepository(AuditLog)
          .find({
            order: {
              created_at: 'DESC',
            },
          });
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
  ) {
    if (!manager) {
      throw new Error(
        'Audit log creation requires an active transaction manager',
      );
    }

    const repository =
      manager.getRepository(AuditLog);

    const auditLog = repository.create({
      organization_id: organizationId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    });

    return repository.save(auditLog);
  }
}