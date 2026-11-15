
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  ForbiddenException,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';
import { OrganizationAccessService } from '../memberships/organization-access.service';

import { ProjectsService } from './projects.service';

describe('ProjectsService usage limits', () => {
  const userId =
    '11111111-1111-4111-8111-111111111111';

  const organizationId =
    '22222222-2222-4222-8222-222222222222';

  const projectId =
    '33333333-3333-4333-8333-333333333333';

  const savedProject = {
    id: projectId,
    organization_id: organizationId,
    name: 'Test Project',
    slug: 'test-project',
    description: null,
    deleted_at: null,
  } as Project;

  const projectCountMock =
    jest.fn<
      (options: {
        where: {
          organization_id: string;
          deleted_at: unknown;
        };
      }) => Promise<number>
    >();

  const projectCreateMock =
    jest.fn<
      (data: Partial<Project>) => Project
    >();

  const projectSaveMock =
    jest.fn<
      (project: Project) => Promise<Project>
    >();

  const queryMock =
    jest.fn<
      (sql: string, parameters?: unknown[]) =>
        Promise<unknown[]>
    >();

  const assertPermissionMock =
    jest.fn<
      OrganizationAccessService['assertPermission']
    >();

  const auditCreateMock =
    jest.fn<
      AuditLogsService['create']
    >();

  const activityCreateMock =
    jest.fn<
      ActivitiesService['create']
    >();

  const runMock =
    jest.fn<
      RlsContextService['run']
    >();

  let service: ProjectsService;

  const createSubscription = (
    overrides: Record<string, unknown> = {},
  ) => ({
    status: 'active',
    current_period_start: new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ),
    current_period_end: new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ),
    plan_is_active: true,
    feature_is_active: true,
    value_type: 'number',
    max_projects_limit: '10',
    ...overrides,
  });

  beforeEach(() => {
    projectCountMock.mockReset();
    projectCreateMock.mockReset();
    projectSaveMock.mockReset();
    queryMock.mockReset();
    assertPermissionMock.mockReset();
    auditCreateMock.mockReset();
    activityCreateMock.mockReset();
    runMock.mockReset();

    projectCountMock.mockResolvedValue(0);

    projectCreateMock.mockReturnValue(
      savedProject,
    );

    projectSaveMock.mockResolvedValue(
      savedProject,
    );

    queryMock.mockImplementation(
      async (sql) => {
        if (
          sql.includes(
            'pg_advisory_xact_lock',
          )
        ) {
          return [];
        }

        return [
          createSubscription(),
        ];
      },
    );

    assertPermissionMock.mockResolvedValue(
      undefined,
    );

    auditCreateMock.mockResolvedValue(
      undefined as never,
    );

    activityCreateMock.mockResolvedValue(
      undefined as never,
    );

    const projectRepository = {
      count: projectCountMock,
      create: projectCreateMock,
      save: projectSaveMock,
    };

    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === Project) {
          return projectRepository;
        }

        throw new Error(
          'Unexpected repository',
        );
      },
      query: queryMock,
    } as unknown as EntityManager;

    runMock.mockImplementation(
      async (_userId, callback) => {
        return callback(manager);
      },
    );

    service = new ProjectsService(
      {
        create: activityCreateMock,
      } as unknown as ActivitiesService,
      {
        create: auditCreateMock,
      } as unknown as AuditLogsService,
      {
        run: runMock,
      } as unknown as RlsContextService,
      {
        assertPermission:
          assertPermissionMock,
      } as unknown as OrganizationAccessService,
    );
  });

  it('allows creation within the project limit', async () => {
    await expect(
      service.create(
        userId,
        organizationId,
        'Test Project',
        'test-project',
      ),
    ).resolves.toBe(savedProject);

    expect(
      assertPermissionMock,
    ).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      organizationId,
      'projects.create',
    );

    expect(
      queryMock,
    ).toHaveBeenCalledWith(
      expect.stringContaining(
        'pg_advisory_xact_lock',
      ),
      [organizationId],
    );

    expect(
      projectCountMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: organizationId,
          deleted_at: expect.anything(),
        }),
      }),
    );

    expect(
      projectSaveMock,
    ).toHaveBeenCalledTimes(1);

    expect(
      auditCreateMock,
    ).toHaveBeenCalledTimes(1);

    expect(
      activityCreateMock,
    ).toHaveBeenCalledTimes(1);
  });

  it('rejects creation when the project limit is reached', async () => {
    projectCountMock.mockResolvedValue(10);

    await expect(
      service.create(
        userId,
        organizationId,
        'Eleventh Project',
        'eleventh-project',
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(
      projectSaveMock,
    ).not.toHaveBeenCalled();

    expect(
      auditCreateMock,
    ).not.toHaveBeenCalled();

    expect(
      activityCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('allows creation when the project count is below the limit', async () => {
    projectCountMock.mockResolvedValue(9);

    await expect(
      service.create(
        userId,
        organizationId,
        'Tenth Project',
        'tenth-project',
      ),
    ).resolves.toBe(savedProject);

    expect(
      projectSaveMock,
    ).toHaveBeenCalledTimes(1);
  });

  it('allows creation after a deleted project frees a slot', async () => {
    projectCountMock.mockResolvedValue(9);

    await expect(
      service.create(
        userId,
        organizationId,
        'Replacement Project',
        'replacement-project',
      ),
    ).resolves.toBe(savedProject);

    expect(
      projectCountMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deleted_at: expect.anything(),
        }),
      }),
    );

    expect(
      projectSaveMock,
    ).toHaveBeenCalledTimes(1);
  });

  it('allows creation for a trialing subscription', async () => {
    queryMock.mockImplementation(
      async (sql) => {
        if (
          sql.includes(
            'pg_advisory_xact_lock',
          )
        ) {
          return [];
        }

        return [
          createSubscription({
            status: 'trialing',
          }),
        ];
      },
    );

    await expect(
      service.create(
        userId,
        organizationId,
        'Trial Project',
        'trial-project',
      ),
    ).resolves.toBe(savedProject);
  });

  it.each([
    'past_due',
    'canceled',
  ])(
    'rejects creation for a %s subscription',
    async (status) => {
      queryMock.mockImplementation(
        async (sql) => {
          if (
            sql.includes(
              'pg_advisory_xact_lock',
            )
          ) {
            return [];
          }

          return [
            createSubscription({
              status,
            }),
          ];
        },
      );

      await expect(
        service.create(
          userId,
          organizationId,
          'Blocked Project',
          'blocked-project',
        ),
      ).rejects.toThrow(
        ForbiddenException,
      );

      expect(
        projectSaveMock,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects creation when the subscription period has expired', async () => {
    queryMock.mockImplementation(
      async (sql) => {
        if (
          sql.includes(
            'pg_advisory_xact_lock',
          )
        ) {
          return [];
        }

        return [
          createSubscription({
            current_period_end: new Date(
              Date.now() - 1000,
            ),
          }),
        ];
      },
    );

    await expect(
      service.create(
        userId,
        organizationId,
        'Expired Project',
        'expired-project',
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );

    expect(
      projectSaveMock,
    ).not.toHaveBeenCalled();
  });

  it('rejects creation when the subscription has not started', async () => {
    queryMock.mockImplementation(
      async (sql) => {
        if (
          sql.includes(
            'pg_advisory_xact_lock',
          )
        ) {
          return [];
        }

        return [
          createSubscription({
            current_period_start: new Date(
              Date.now() + 60 * 60 * 1000,
            ),
          }),
        ];
      },
    );

    await expect(
      service.create(
        userId,
        organizationId,
        'Future Project',
        'future-project',
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects creation when the plan is inactive', async () => {
    queryMock.mockImplementation(
      async (sql) => {
        if (
          sql.includes(
            'pg_advisory_xact_lock',
          )
        ) {
          return [];
        }

        return [
          createSubscription({
            plan_is_active: false,
          }),
        ];
      },
    );

    await expect(
      service.create(
        userId,
        organizationId,
        'Inactive Plan Project',
        'inactive-plan-project',
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects creation without projects.create permission', async () => {
    assertPermissionMock.mockRejectedValue(
      new ForbiddenException(
        'You do not have permission: projects.create',
      ),
    );

    await expect(
      service.create(
        userId,
        organizationId,
        'Unauthorized Project',
        'unauthorized-project',
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );

    expect(
      queryMock,
    ).not.toHaveBeenCalled();

    expect(
      projectSaveMock,
    ).not.toHaveBeenCalled();

    expect(
      auditCreateMock,
    ).not.toHaveBeenCalled();

    expect(
      activityCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('preserves unlimited behavior when no subscription exists', async () => {
    queryMock.mockImplementation(
      async (sql) => {
        if (
          sql.includes(
            'pg_advisory_xact_lock',
          )
        ) {
          return [];
        }

        return [];
      },
    );

    await expect(
      service.create(
        userId,
        organizationId,
        'Unrestricted Project',
        'unrestricted-project',
      ),
    ).resolves.toBe(savedProject);

    expect(
      projectCountMock,
    ).not.toHaveBeenCalled();

    expect(
      projectSaveMock,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not create audit or activity when the limit is reached', async () => {
    projectCountMock.mockResolvedValue(10);

    await expect(
      service.create(
        userId,
        organizationId,
        'Blocked Project',
        'blocked-project',
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );

    expect(
      auditCreateMock,
    ).not.toHaveBeenCalled();

    expect(
      activityCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('passes the organization ID to the advisory lock', async () => {
    await service.create(
      userId,
      organizationId,
      'Lock Test',
      'lock-test',
    );

    expect(
      queryMock,
    ).toHaveBeenCalledWith(
      expect.stringContaining(
        'pg_advisory_xact_lock',
      ),
      [organizationId],
    );
  });
});
