import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { EmailService } from '../email/email.service';
import { Invitation } from '../entities/invitation.entity';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
    private readonly emailService: EmailService,
  ) {}

  async findAll(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Invitation);

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
    const invitation =
      await this.rlsContextService.run(
        currentUserId,
        async (manager) => {
          const repository =
            manager.getRepository(Invitation);

          const token =
            randomBytes(32).toString(
              'hex',
            );

          const newInvitation =
            repository.create({
              organization_id:
                organizationId,
              email,
              role_id: roleId,
              token,
              expires_at: expiresAt,
              accepted_at: null,
              revoked_at: null,
              deleted_at: null,
            });

          const savedInvitation =
            await repository.save(
              newInvitation,
            );

          const metadata = {
            email:
              savedInvitation.email,
            role_id:
              savedInvitation.role_id,
            expires_at:
              savedInvitation.expires_at,
          };

          await this.activitiesService.create(
            currentUserId,
            organizationId,
            'created',
            'invitation',
            savedInvitation.id,
            metadata,
            manager,
          );

          await this.auditLogsService.create(
            organizationId,
            currentUserId,
            'created',
            'invitation',
            savedInvitation.id,
            metadata,
            undefined,
            undefined,
            manager,
          );

          return savedInvitation;
        },
      );

    await this.emailService.sendInvitation(
      invitation.email,
      invitation.token,
    );

    return invitation;
  }

  async accept(
    currentUserId: string,
    token: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const result =
          await manager.query(
            `
              SELECT public.accept_invitation($1)
                AS membership_id;
            `,
            [token],
          );

        const membershipId =
          result[0]
            .membership_id as string;

        const membershipResult =
          await manager.query(
            `
              SELECT organization_id
              FROM public.memberships
              WHERE id = $1
                AND user_id = $2
                AND deleted_at IS NULL
              LIMIT 1;
            `,
            [
              membershipId,
              currentUserId,
            ],
          );

        if (
          membershipResult.length === 0
        ) {
          throw new Error(
            'Accepted membership could not be loaded',
          );
        }

        const organizationId =
          membershipResult[0]
            .organization_id as string;

        const repository =
          manager.getRepository(Invitation);

        const invitation =
          await repository.findOne({
            where: {
              token,
            },
          });

        if (!invitation) {
          throw new NotFoundException(
            'Accepted invitation could not be loaded',
          );
        }

        const metadata = {
          email: invitation.email,
          role_id:
            invitation.role_id,
          membership_id:
            membershipId,
        };

        await this.activitiesService.create(
          currentUserId,
          organizationId,
          'accepted',
          'invitation',
          invitation.id,
          metadata,
          manager,
        );

        await this.auditLogsService.create(
          organizationId,
          currentUserId,
          'accepted',
          'invitation',
          invitation.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        return {
          membership_id:
            membershipId,
          organization_id:
            organizationId,
        };
      },
    );
  }

  async revoke(
    currentUserId: string,
    invitationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Invitation);

        const invitation =
          await repository.findOne({
            where: {
              id: invitationId,
            },
          });

        if (!invitation) {
          throw new NotFoundException(
            'Invitation not found',
          );
        }

        if (invitation.accepted_at) {
          throw new BadRequestException(
            'Accepted invitations cannot be revoked',
          );
        }

        if (invitation.revoked_at) {
          throw new BadRequestException(
            'Invitation has already been revoked',
          );
        }

        if (
          invitation.expires_at.getTime() <=
          Date.now()
        ) {
          throw new BadRequestException(
            'Expired invitations cannot be revoked',
          );
        }

        invitation.revoked_at =
          new Date();

        const savedInvitation =
          await repository.save(
            invitation,
          );

        const metadata = {
          email:
            savedInvitation.email,
          role_id:
            savedInvitation.role_id,
          revoked_at:
            savedInvitation.revoked_at,
        };

        await this.activitiesService.create(
          currentUserId,
          savedInvitation.organization_id,
          'revoked',
          'invitation',
          savedInvitation.id,
          metadata,
          manager,
        );

        await this.auditLogsService.create(
          savedInvitation.organization_id,
          currentUserId,
          'revoked',
          'invitation',
          savedInvitation.id,
          metadata,
          undefined,
          undefined,
          manager,
        );

        return savedInvitation;
      },
    );
  }

  async resend(
    currentUserId: string,
    invitationId: string,
  ) {
    const invitation =
      await this.rlsContextService.run(
        currentUserId,
        async (manager) => {
          const repository =
            manager.getRepository(Invitation);

          const existingInvitation =
            await repository.findOne({
              where: {
                id: invitationId,
              },
            });

          if (!existingInvitation) {
            throw new NotFoundException(
              'Invitation not found',
            );
          }

          if (
            existingInvitation.accepted_at
          ) {
            throw new BadRequestException(
              'Accepted invitations cannot be resent',
            );
          }

          const expiresAt = new Date();

          expiresAt.setDate(
            expiresAt.getDate() + 7,
          );

          existingInvitation.token =
            randomBytes(32).toString(
              'hex',
            );

          existingInvitation.expires_at =
            expiresAt;

          existingInvitation.revoked_at =
            null;

          const savedInvitation =
            await repository.save(
              existingInvitation,
            );

          const metadata = {
            email:
              savedInvitation.email,
            role_id:
              savedInvitation.role_id,
            expires_at:
              savedInvitation.expires_at,
          };

          await this.activitiesService.create(
            currentUserId,
            savedInvitation.organization_id,
            'resent',
            'invitation',
            savedInvitation.id,
            metadata,
            manager,
          );

          await this.auditLogsService.create(
            savedInvitation.organization_id,
            currentUserId,
            'resent',
            'invitation',
            savedInvitation.id,
            metadata,
            undefined,
            undefined,
            manager,
          );

          return savedInvitation;
        },
      );

    await this.emailService.sendInvitation(
      invitation.email,
      invitation.token,
    );

    return invitation;
  }
}