import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { EntityManager } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { EmailService } from '../email/email.service';
import { Invitation } from '../entities/invitation.entity';
import { OrganizationAccessService } from '../memberships/organization-access.service';

type InvitationResponse = Omit<Invitation, 'token'>;

type InvitationRole = {
  id: string;
  slug: string;
};

type AcceptedInvitationDetails = {
  membership_id: string;
  organization_id: string;
  invitation_id: string;
  email: string;
  role_id: string;
};

@Injectable()
export class InvitationsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly rlsContextService: RlsContextService,
    private readonly emailService: EmailService,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  private toResponse(invitation: Invitation): InvitationResponse {
    const { token: _token, ...safeInvitation } = invitation;
    return safeInvitation;
  }

  private async assertCanManageInvitations(
    manager: EntityManager,
    currentUserId: string,
    organizationId: string,
  ): Promise<void> {
    await this.organizationAccessService.assertPermission(
      manager,
      currentUserId,
      organizationId,
      'members.manage',
    );
  }

  private async assertCanAssignRole(
    manager: EntityManager,
    currentUserId: string,
    organizationId: string,
    roleId: string,
  ): Promise<void> {
    const roles: InvitationRole[] = await manager.query(
      `
        SELECT id, slug
        FROM public.roles
        WHERE id = $1
          AND organization_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [roleId, organizationId],
    );

    const role = roles[0];

    if (!role) {
      throw new BadRequestException(
        'Invalid invitation role for this organization',
      );
    }

    if (role.slug === 'administrator') {
      await this.organizationAccessService.assertPermission(
        manager,
        currentUserId,
        organizationId,
        'roles.manage',
      );
    }
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

        case 'Organization member limit reached':
          throw new ConflictException(
            'Organization member limit reached. Your plan does not allow additional active members.',
          );

        case 'Organization not found or inactive':
          throw new NotFoundException('Organization not found or inactive');

        case 'An active subscription is required to accept invitations':
          throw new ForbiddenException(
            'An active subscription is required to accept invitations',
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
        await this.assertCanManageInvitations(
          manager,
          currentUserId,
          organizationId,
        );

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
        await this.assertCanManageInvitations(
          manager,
          currentUserId,
          organizationId,
        );

        await this.assertCanAssignRole(
          manager,
          currentUserId,
          organizationId,
          roleId,
        );

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

        const savedInvitation = await repository.save(
          newInvitation,
        );

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
          const result: AcceptedInvitationDetails[] =
            await manager.query(
              `
                SELECT
                  membership_id,
                  organization_id,
                  invitation_id,
                  email,
                  role_id
                FROM public.accept_invitation_with_details($1);
              `,
              [token],
            );

          const acceptedInvitation = result[0];

          if (!acceptedInvitation) {
            throw new Error(
              'Accepted invitation details could not be loaded',
            );
          }

          const {
            membership_id: membershipId,
            organization_id: organizationId,
            invitation_id: invitationId,
            email,
            role_id: roleId,
          } = acceptedInvitation;

          const metadata = {
            email,
            role_id: roleId,
            membership_id: membershipId,
          };

          await this.activitiesService.create(
            currentUserId,
            organizationId,
            'accepted',
            'invitation',
            invitationId,
            metadata,
            manager,
          );

          await this.auditLogsService.create(
            organizationId,
            currentUserId,
            'accepted',
            'invitation',
            invitationId,
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

        await this.assertCanManageInvitations(
          manager,
          currentUserId,
          invitation.organization_id,
        );

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

        const savedInvitation = await repository.save(
          invitation,
        );

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

        await this.assertCanManageInvitations(
          manager,
          currentUserId,
          existingInvitation.organization_id,
        );

        await this.assertCanAssignRole(
          manager,
          currentUserId,
          existingInvitation.organization_id,
          existingInvitation.role_id,
        );

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
