import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Session } from '../entities/session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
  ) {}

  async create(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const session = this.sessionsRepository.create({
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      expires_at: expiresAt,
      user_agent: userAgent ?? null,
      ip_address: ipAddress ?? null,
    });

    return this.sessionsRepository.save(session);
  }

  async findById(id: string) {
    return this.sessionsRepository.findOne({
      where: {
        id,
      },
    });
  }

  async findByUserId(userId: string) {
    return this.sessionsRepository.find({
      where: {
        user_id: userId,
        revoked_at: IsNull(),
      },
    });
  }

  async revoke(id: string) {
    await this.sessionsRepository.update(
      {
        id,
      },
      {
        revoked_at: new Date(),
      },
    );
  }
}