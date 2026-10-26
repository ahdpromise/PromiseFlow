
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

import { InvitationsService } from './invitations.service';
import type { Invitation } from '../entities/invitation.entity';

describe('InvitationsService - Token Security', () => {
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
    getRepository: jest.fn(() => repository),
  };

  type MockManager = typeof manager;

  const rlsContextService = {
    run: jest.fn(
      async (
        _userId: string,
        callback: (entityManager: MockManager) => Promise<unknown>,
      ): Promise<unknown> => callback(manager),
    ),
  };

  const activitiesService = {
    create: jest.fn(async () => undefined),
  };

  const auditLogsService = {
    create: jest.fn(async () => undefined),
  };

  const emailService = {
    sendInvitation: jest.fn(
      async (_email: string, _token: string) => undefined,
    ),
  };

  let service: InvitationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new InvitationsService(
      activitiesService as never,
      auditLogsService as never,
      rlsContextService as never,
      emailService as never,
    );

    repository.find.mockResolvedValue([makeInvitation()]);
    repository.findOne.mockResolvedValue(makeInvitation());

    repository.create.mockImplementation(
      (data: Invitation) => data,
    );

    repository.save.mockImplementation(
      async (data: Invitation) => data,
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
});
