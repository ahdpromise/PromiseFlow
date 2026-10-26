
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { EmailService } from '../email/email.service';
import { Invitation } from '../entities/invitation.entity';

type InvitationResponse = Omit<Invitation, 'token'>;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
    private readonly emailService: EmailService,
  ) {}

  private toResponse(invitation: Invitation): InvitationResponse {
    const { token: _token, ...safeInvitation } = invitation;
    return safeInvitation;
  }

  private handleAcceptanceError(error: unknown): never {
    const databaseError = error as {
      driverError?: {
        code?: string;
        message?: string;
      };
    };

    const code = databaseError?.driverError?.code;
    const message = databaseError?.driverError?.message;

    // Only translate known errors from our PostgreSQL function.
    // Unexpected database failures must not be disguised.
    if (code === 'P0001') {
      switch (message) {
        case 'Invitation not found':
          throw new NotFoundException('Invitation not found');

        case 'Invitation has already been accepted':
          throw new ConflictException(
            'Invitation has already been accepted',
          );

        case 'User is already a member of this organization':
          throw new ConflictException(
            'User is already a member of this organization',
          );

        case 'Invitation has been revoked':
          throw new BadRequestException(
            'Invitation has been revoked',
          );

        case 'Invitation has expired':
          throw new BadRequestException(
            'Invitation has expired',
          );

        case 'Invitation email does not match current user':
          throw new BadRequestException(
            'Invitation email does not match current user',
          );

        case 'Invitation role is invalid':
          throw new BadRequestException(
            'Invitation role is invalid',
          );

        case 'Current user not found':
          throw new BadRequestException(
            'Current user not found',
          );

        case 'app.user_id is not set':
          throw new BadRequestException(
            'Invitation cannot be accepted without a user',
          );
      }
    }

    throw error;
  }

  async findAll(
    currentUserId: string,
    organizationId: string,
  ): Promise<InvitationResponse[]> {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Invitation);

        const invitations = await repository.find({
          where: {
            organization_id: organizationId,
          },
          order: {
            created_at: 'DESC',
          },
        });

        return invitations.map((invitation) =>
          this.toResponse(invitation),
        );
      },
    );
  }

  async create(
    currentUserId: string,
    organizationId: string,
    email: string,
    roleId: string,
    expiresAt: Date,
  ): Promise<InvitationResponse> {
    const invitation = await this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Invitation);

        const token = randomBytes(32).toString('hex');

        const newInvitation = repository.create({
          organization_id: organizationId,
          email,
          role_id: roleId,
          token,
          expires_at: expiresAt,
          accepted_at: null,
          revoked_at: null,
          deleted_at: null,
        });

        const savedInvitation = await repository.save(newInvitation);

        const metadata = {
          email: savedInvitation.email,
          role_id: savedInvitation.role_id,
          expires_at: savedInvitation.expires_at,
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

    return this.toResponse(invitation);
  }

  async accept(
    currentUserId: string,
    token: string,
  ): Promise<{
    membership_id: string;
    organization_id: string;
  }> {
    try {
      return await this.rlsContextService.run(
        currentUserId,
        async (manager) => {
          const result: Array<{ membership_id: string }> =
            await manager.query(
              `
                SELECT public.accept_invitation($1)
                  AS membership_id;
              `,
              [token],
            );

          const membershipId = result[0].membership_id;

          const membershipResult: Array<{
            organization_id: string;
          }> = await manager.query(
            `
              SELECT organization_id
              FROM public.memberships
              WHERE id = $1
                AND user_id = $2
                AND deleted_at IS NULL
              LIMIT 1;
            `,
            [membershipId, currentUserId],
          );

          if (membershipResult.length === 0) {
            throw new Error(
              'Accepted membership could not be loaded',
            );
          }

          const organizationId =
            membershipResult[0].organization_id;

          const repository = manager.getRepository(Invitation);

          const invitation = await repository.findOne({
            where: { token },
          });

          if (!invitation) {
            throw new NotFoundException(
              'Accepted invitation could not be loaded',
            );
          }

          const metadata = {
            email: invitation.email,
            role_id: invitation.role_id,
            membership_id: membershipId,
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
            membership_id: membershipId,
            organization_id: organizationId,
          };
        },
      );
    } catch (error: unknown) {
      return this.handleAcceptanceError(error);
    }
  }

  async revoke(
    currentUserId: string,
    invitationId: string,
  ): Promise<InvitationResponse> {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Invitation);

        const invitation = await repository.findOne({
          where: { id: invitationId },
        });

        if (!invitation) {
          throw new NotFoundException('Invitation not found');
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

        if (invitation.expires_at.getTime() <= Date.now()) {
          throw new BadRequestException(
            'Expired invitations cannot be revoked',
          );
        }

        invitation.revoked_at = new Date();

        const savedInvitation = await repository.save(invitation);

        const metadata = {
          email: savedInvitation.email,
          role_id: savedInvitation.role_id,
          revoked_at: savedInvitation.revoked_at,
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

        return this.toResponse(savedInvitation);
      },
    );
  }

  async resend(
    currentUserId: string,
    invitationId: string,
  ): Promise<InvitationResponse> {
    const invitation = await this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Invitation);

        const existingInvitation = await repository.findOne({
          where: { id: invitationId },
        });

        if (!existingInvitation) {
          throw new NotFoundException('Invitation not found');
        }

        if (existingInvitation.accepted_at) {
          throw new BadRequestException(
            'Accepted invitations cannot be resent',
          );
        }

        if (existingInvitation.revoked_at) {
          throw new BadRequestException(
            'Revoked invitations cannot be resent',
          );
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        existingInvitation.token = randomBytes(32).toString('hex');
        existingInvitation.expires_at = expiresAt;

        const savedInvitation = await repository.save(
          existingInvitation,
        );

        const metadata = {
          email: savedInvitation.email,
          role_id: savedInvitation.role_id,
          expires_at: savedInvitation.expires_at,
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

    return this.toResponse(invitation);
  }
}
