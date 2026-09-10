import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { RlsContextService } from '../database/rls-context.service';
import { Invitation } from '../entities/invitation.entity';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Invitation);

        return repository.find({
          where: {
            organization_id: organizationId,
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }

  async create(
    currentUserId: string,
    organizationId: string,
    email: string,
    roleId: string,
    expiresAt: Date,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Invitation);

        const token = randomBytes(32).toString('hex');

        const invitation = repository.create({
          organization_id: organizationId,
          email,
          role_id: roleId,
          token,
          expires_at: expiresAt,
          accepted_at: null,
          deleted_at: null,
        });

        return repository.save(invitation);
      },
    );
  }

  async accept(
    currentUserId: string,
    token: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const result = await manager.query(
          `
            SELECT public.accept_invitation($1) AS membership_id;
          `,
          [token],
        );

        return {
          membership_id: result[0].membership_id as string,
        };
      },
    );
  }
}