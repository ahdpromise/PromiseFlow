
import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { ActivitiesService } from '../activities/activities.service';
import { AutomationExecutionService } from '../automations/automation-execution.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RlsContextService } from '../database/rls-context.service';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';
import { OrganizationAccessService } from '../memberships/organization-access.service';

import { TasksService } from './tasks.service';

describe('TasksService remove authorization', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const taskId = '22222222-2222-4222-8222-222222222222';
  const projectId = '33333333-3333-4333-8333-333333333333';
  const organizationId = '44444444-4444-4444-8444-444444444444';

  const task = {
    id: taskId,
    project_id: projectId,
    title: 'Security test task',
    deleted_at: null,
  } as Task;

  const project = {
    id: projectId,
    organization_id: organizationId,
    deleted_at: null,
  } as Project;

  const taskFindOneMock =
    jest.fn<() => Promise<Task | null>>();

  const projectFindOneMock =
    jest.fn<() => Promise<Project | null>>();

  const queryMock =
    jest.fn<
      (sql: string, parameters: unknown[]) =>
        Promise<Array<{ soft_delete_task: boolean }>>
    >();

  const assertPermissionMock =
    jest.fn<OrganizationAccessService['assertPermission']>();

  const auditCreateMock =
    jest.fn<AuditLogsService['create']>();

  const activityCreateMock =
    jest.fn<ActivitiesService['create']>();

  const runMock =
    jest.fn<RlsContextService['run']>();

  let service: TasksService;

  beforeEach(() => {
    taskFindOneMock.mockReset();
    projectFindOneMock.mockReset();
    queryMock.mockReset();
    assertPermissionMock.mockReset();
    auditCreateMock.mockReset();
    activityCreateMock.mockReset();
    runMock.mockReset();

    taskFindOneMock.mockResolvedValue(task);
    projectFindOneMock.mockResolvedValue(project);

    queryMock.mockResolvedValue([
      { soft_delete_task: true },
    ]);

    assertPermissionMock.mockResolvedValue(undefined);
    auditCreateMock.mockResolvedValue(undefined as never);
    activityCreateMock.mockResolvedValue(undefined as never);

    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === Task) {
          return {
            findOne: taskFindOneMock,
          };
        }

        if (entity === Project) {
          return {
            findOne: projectFindOneMock,
          };
        }

        throw new Error('Unexpected repository');
      },
      query: queryMock,
    } as unknown as EntityManager;

    runMock.mockImplementation(async (_userId, callback) => {
      return callback(manager);
    });

    service = new TasksService(
      {
        create: activityCreateMock,
      } as unknown as ActivitiesService,
      {} as AutomationExecutionService,
      {
        create: auditCreateMock,
      } as unknown as AuditLogsService,
      {
        run: runMock,
      } as unknown as RlsContextService,
      {
        assertPermission: assertPermissionMock,
      } as unknown as OrganizationAccessService,
    );
  });

  it('rejects deletion without tasks.delete permission', async () => {
    assertPermissionMock.mockRejectedValue(
      new ForbiddenException(
        'You do not have permission: tasks.delete',
      ),
    );

    await expect(
      service.remove(userId, taskId),
    ).rejects.toThrow(ForbiddenException);

    expect(assertPermissionMock).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      organizationId,
      'tasks.delete',
    );

    expect(queryMock).not.toHaveBeenCalled();
    expect(auditCreateMock).not.toHaveBeenCalled();
    expect(activityCreateMock).not.toHaveBeenCalled();
  });

  it('allows authorized deletion and records audit/activity', async () => {
    await expect(
      service.remove(userId, taskId),
    ).resolves.toEqual({
      id: taskId,
      deleted: true,
    });

    expect(assertPermissionMock).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      organizationId,
      'tasks.delete',
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('public.soft_delete_task($1)'),
      [taskId],
    );

    expect(auditCreateMock).toHaveBeenCalledTimes(1);
    expect(activityCreateMock).toHaveBeenCalledTimes(1);
  });

  it('rejects deletion when the task does not exist', async () => {
    taskFindOneMock.mockResolvedValue(null);

    await expect(
      service.remove(userId, taskId),
    ).rejects.toThrow(NotFoundException);

    expect(assertPermissionMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
