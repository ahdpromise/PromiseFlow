import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Session } from '../entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async create(
    currentUserId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const sessionsRepository =
          manager.getRepository(Session);

        const session =
          sessionsRepository.create({
            user_id: currentUserId,
            refresh_token_hash: refreshTokenHash,
            expires_at: expiresAt,
            user_agent: userAgent ?? null,
            ip_address: ipAddress ?? null,
          });

        return sessionsRepository.save(session);
      },
    );
  }

  async findById(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        return manager.getRepository(Session).findOne({
          where: {
            id,
            user_id: currentUserId,
          },
        });
      },
    );
  }

  async findByUserId(
    currentUserId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        return manager.getRepository(Session).find({
          where: {
            user_id: currentUserId,
            revoked_at: IsNull(),
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }

  async revoke(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const result = await manager
          .getRepository(Session)
          .update(
            {
              id,
              user_id: currentUserId,
            },
            {
              revoked_at: new Date(),
            },
          );

        return {
          revoked: result.affected === 1,
        };
      },
    );
  }
}