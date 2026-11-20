import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { Invitation } from '../entities/invitation.entity';
import { InvitationsService } from './invitations.service';

describe('InvitationsService - Token Security and RBAC', () => {
  const token = 'secret-test-token';

  const makeInvitation = (): Invitation =>
    ({
      id: 'invitation-1',
      organization_id: 'organization-1',
      email: 'test@example.invalid',
      role_id: 'role-1',
      token,
      expires_at: new Date(Date.now() + 86400000),
      accepted_at: null,
      revoked_at: null,
      deleted_at: null,
      created_at: new Date(),
    }) as Invitation;

  const repository = {
    find: jest.fn<() => Promise<Invitation[]>>(),
    findOne: jest.fn<() => Promise<Invitation | null>>(),
    create: jest.fn<(data: Invitation) => Invitation>(),
    save: jest.fn<(data: Invitation) => Promise<Invitation>>(),
  };

  const manager = {
    getRepository: jest.fn<() => typeof repository>(),
    query: jest.fn<(sql: string, parameters: unknown[]) => Promise<Array<{
      id: string;
      slug: string;
    }>>>(),
  };

  type MockManager = typeof manager;

  const rlsContextService = {
    run: jest.fn<
      (
        userId: string,
        callback: (entityManager: MockManager) => Promise<unknown>,
      ) => Promise<unknown>
    >(),
  };

  const activitiesService = {
    create: jest.fn<() => Promise<void>>(),
  };

  const auditLogsService = {
    create: jest.fn<() => Promise<void>>(),
  };

  const emailService = {
    sendInvitation: jest.fn<
      (email: string, invitationToken: string) => Promise<void>
    >(),
  };

  const organizationAccessService = {
    assertPermission: jest.fn<
      (
        entityManager: MockManager,
        userId: string,
        organizationId: string,
        permission: string,
      ) => Promise<void>
    >(),
  };

  let service: InvitationsService;

  beforeEach(() => {
    jest.resetAllMocks();

    manager.getRepository.mockReturnValue(repository);

    manager.query.mockResolvedValue([
      {
        id: 'role-1',
        slug: 'project-manager',
      },
    ]);

    rlsContextService.run.mockImplementation(
      async (_userId, callback) => callback(manager),
    );

    activitiesService.create.mockResolvedValue(undefined);
    auditLogsService.create.mockResolvedValue(undefined);
    emailService.sendInvitation.mockResolvedValue(undefined);

    organizationAccessService.assertPermission.mockResolvedValue(
      undefined,
    );

    repository.find.mockResolvedValue([makeInvitation()]);
    repository.findOne.mockResolvedValue(makeInvitation());

    repository.create.mockImplementation(
      (data) => data,
    );

    repository.save.mockImplementation(
      async (data) => data,
    );

    service = new InvitationsService(
      activitiesService as never,
      auditLogsService as never,
      rlsContextService as never,
      emailService as never,
      organizationAccessService as never,
    );
  });

  function expectTokenHidden(response: unknown): void {
    expect(response).not.toHaveProperty('token');
    expect(JSON.stringify(response)).not.toContain(token);
  }

  it('findAll does not expose invitation tokens', async () => {
    const result = await service.findAll(
      'user-1',
      'organization-1',
    );

    expect(result).toHaveLength(1);
    expectTokenHidden(result[0]);
  });

  it('create hides token but sends it by email', async () => {
    const result = await service.create(
      'user-1',
      'organization-1',
      'test@example.invalid',
      'role-1',
      new Date(Date.now() + 86400000),
    );

    expectTokenHidden(result);

    expect(emailService.sendInvitation).toHaveBeenCalledTimes(1);

    const emailArguments =
      emailService.sendInvitation.mock.calls[0];

    expect(emailArguments[0]).toBe('test@example.invalid');
    expect(typeof emailArguments[1]).toBe('string');
    expect(emailArguments[1]).toHaveLength(64);

    expect(JSON.stringify(result)).not.toContain(
      emailArguments[1],
    );
  });

  it('revoke does not expose invitation token', async () => {
    const result = await service.revoke(
      'user-1',
      'invitation-1',
    );

    expectTokenHidden(result);
    expect(result.revoked_at).toBeInstanceOf(Date);
  });

  it('resend hides token but sends new token by email', async () => {
    const result = await service.resend(
      'user-1',
      'invitation-1',
    );

    expectTokenHidden(result);

    expect(emailService.sendInvitation).toHaveBeenCalledTimes(1);

    const emailArguments =
      emailService.sendInvitation.mock.calls[0];

    expect(emailArguments[0]).toBe('test@example.invalid');
    expect(typeof emailArguments[1]).toBe('string');
    expect(emailArguments[1]).toHaveLength(64);

    expect(JSON.stringify(result)).not.toContain(
      emailArguments[1],
    );
  });

  it('requires members.manage to list invitations', async () => {
    await service.findAll('user-1', 'organization-1');

    expect(
      organizationAccessService.assertPermission,
    ).toHaveBeenCalledWith(
      manager,
      'user-1',
      'organization-1',
      'members.manage',
    );
  });

  it('requires members.manage to create invitations', async () => {
    await service.create(
      'user-1',
      'organization-1',
      'test@example.invalid',
      'role-1',
      new Date(Date.now() + 86400000),
    );

    expect(
      organizationAccessService.assertPermission,
    ).toHaveBeenCalledWith(
      manager,
      'user-1',
      'organization-1',
      'members.manage',
    );
  });

  it('requires roles.manage for administrator invitations', async () => {
    manager.query.mockResolvedValue([
      {
        id: 'role-1',
        slug: 'administrator',
      },
    ]);

    await service.create(
      'user-1',
      'organization-1',
      'test@example.invalid',
      'role-1',
      new Date(Date.now() + 86400000),
    );

    expect(
      organizationAccessService.assertPermission,
    ).toHaveBeenCalledWith(
      manager,
      'user-1',
      'organization-1',
      'members.manage',
    );

    expect(
      organizationAccessService.assertPermission,
    ).toHaveBeenCalledWith(
      manager,
      'user-1',
      'organization-1',
      'roles.manage',
    );
  });

  it('rejects invitation roles from another organization', async () => {
    manager.query.mockResolvedValue([]);

    await expect(
      service.create(
        'user-1',
        'organization-1',
        'test@example.invalid',
        'role-from-another-organization',
        new Date(Date.now() + 86400000),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(emailService.sendInvitation).not.toHaveBeenCalled();
  });

  it('rejects unauthorized invitation creation', async () => {
    organizationAccessService.assertPermission.mockRejectedValue(
      new ForbiddenException('Permission denied'),
    );

    await expect(
      service.create(
        'user-1',
        'organization-1',
        'test@example.invalid',
        'role-1',
        new Date(Date.now() + 86400000),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(emailService.sendInvitation).not.toHaveBeenCalled();
  });

  it('rejects administrator invitation without roles.manage', async () => {
    manager.query.mockResolvedValue([
      {
        id: 'role-1',
        slug: 'administrator',
      },
    ]);

    organizationAccessService.assertPermission.mockImplementation(
      async (
        _manager,
        _userId,
        _organizationId,
        permission,
      ) => {
        if (permission === 'roles.manage') {
          throw new ForbiddenException('Permission denied');
        }
      },
    );

    await expect(
      service.create(
        'user-1',
        'organization-1',
        'test@example.invalid',
        'role-1',
        new Date(Date.now() + 86400000),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(emailService.sendInvitation).not.toHaveBeenCalled();
  });

  it('requires members.manage to revoke invitations', async () => {
    await service.revoke('user-1', 'invitation-1');

    expect(
      organizationAccessService.assertPermission,
    ).toHaveBeenCalledWith(
      manager,
      'user-1',
      'organization-1',
      'members.manage',
    );
  });

  it('requires members.manage to resend invitations', async () => {
    await service.resend('user-1', 'invitation-1');

    expect(
      organizationAccessService.assertPermission,
    ).toHaveBeenCalledWith(
      manager,
      'user-1',
      'organization-1',
      'members.manage',
    );
  });

  it('requires roles.manage to resend administrator invitations', async () => {
    manager.query.mockResolvedValue([
      {
        id: 'role-1',
        slug: 'administrator',
      },
    ]);

    await service.resend('user-1', 'invitation-1');

    expect(
      organizationAccessService.assertPermission,
    ).toHaveBeenCalledWith(
      manager,
      'user-1',
      'organization-1',
      'roles.manage',
    );
  });

  it('does not send email when administrator resend is forbidden', async () => {
    manager.query.mockResolvedValue([
      {
        id: 'role-1',
        slug: 'administrator',
      },
    ]);

    organizationAccessService.assertPermission.mockImplementation(
      async (
        _manager,
        _userId,
        _organizationId,
        permission,
      ) => {
        if (permission === 'roles.manage') {
          throw new ForbiddenException('Permission denied');
        }
      },
    );

    await expect(
      service.resend('user-1', 'invitation-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(emailService.sendInvitation).not.toHaveBeenCalled();
  });

  describe('accept - PostgreSQL errors and audit', () => {
    const accepted = {
      membership_id: 'membership-1',
      organization_id: 'organization-1',
      invitation_id: 'invitation-1',
      email: 'test@example.invalid',
      role_id: 'role-1',
    };

    const pgError = (message: string, code = 'P0001') => ({
      driverError: { code, message },
    });

    it('returns membership details and records activity and audit', async () => {
      manager.query.mockResolvedValue([accepted] as never);

      await expect(service.accept('user-1', token)).resolves.toEqual({
        membership_id: 'membership-1',
        organization_id: 'organization-1',
      });
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('public.accept_invitation_with_details($1)'),
        [token],
      );
      expect(activitiesService.create).toHaveBeenCalledTimes(1);
      expect(auditLogsService.create).toHaveBeenCalledTimes(1);
      expect(emailService.sendInvitation).not.toHaveBeenCalled();
    });

    it.each([
      ['Organization member limit reached', ConflictException, 409],
      ['User is already a member of this organization', ConflictException, 409],
      ['Invitation has already been accepted', ConflictException, 409],
      ['Invitation has expired', BadRequestException, 400],
      ['Invitation has been revoked', BadRequestException, 400],
      ['Invitation not found', NotFoundException, 404],
      ['Organization not found or inactive', NotFoundException, 404],
      [
        'An active subscription is required to accept invitations',
        ForbiddenException,
        403,
      ],
    ])('maps PostgreSQL error %s', async (message, exceptionType, status) => {
      manager.query.mockRejectedValue(pgError(message));
      try {
        await service.accept('user-1', token);
        throw new Error('Expected acceptance to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(exceptionType);
        expect((error as { getStatus(): number }).getStatus()).toBe(status);
      }
      expect(activitiesService.create).not.toHaveBeenCalled();
      expect(auditLogsService.create).not.toHaveBeenCalled();
    });

    it.each([
      'Invalid subscription configuration',
      'Invalid max_members feature configuration',
      'Invalid max_members limit configuration',
    ])('does not disguise invalid configuration: %s', async (message) => {
      const error = pgError(message);
      manager.query.mockRejectedValue(error);
      await expect(service.accept('user-1', token)).rejects.toBe(error);
    });

    it('preserves unexpected PostgreSQL failures', async () => {
      const error = pgError('unexpected database failure', 'XX000');
      manager.query.mockRejectedValue(error);
      await expect(service.accept('user-1', token)).rejects.toBe(error);
    });

    it('rejects missing accepted invitation details', async () => {
      manager.query.mockResolvedValue([]);
      await expect(service.accept('user-1', token)).rejects.toThrow(
        'Accepted invitation details could not be loaded',
      );
    });
  });

});