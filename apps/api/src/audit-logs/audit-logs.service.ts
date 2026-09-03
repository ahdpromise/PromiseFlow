import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  async findAll(userId?: string) {
    if (userId) {
      return this.auditLogsRepository.find({
        where: {
          user_id: userId,
        },
        order: {
          created_at: 'DESC',
        },
      });
    }

    return this.auditLogsRepository.find({
      order: {
        created_at: 'DESC',
      },
    });
  }

  async create(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const auditLog = this.auditLogsRepository.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
    });

    return this.auditLogsRepository.save(auditLog);
  }
}