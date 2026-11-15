
import { jest } from '@jest/globals';
import 'reflect-metadata';
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { ActivitiesService } from '../src/activities/activities.service';
import { AuditLogsService } from '../src/audit-logs/audit-logs.service';
import { getPostgresConnectionOptions } from '../src/database/postgres-connection.options';
import { RlsContextService } from '../src/database/rls-context.service';
import { MembershipsService } from '../src/memberships/memberships.service';
import { OrganizationAccessService } from '../src/memberships/organization-access.service';
import { ProjectsService } from '../src/projects/projects.service';

const TEST_DATABASE = 'promiseflow_rls_test';

describe('Projects Pro Limit - Real PostgreSQL Integration', () => {
  it(
    'enforces the Pro limit under concurrent requests and preserves audit consistency',
    async () => {
      if (
        process.env.F03_TEST_DATABASE !== TEST_DATABASE ||
        process.env.NODE_ENV === 'production'
      ) {
        throw new Error(
          'STOP: Explicit isolated test database confirmation required',
        );
      }

      const adminPassword = process.env.F03_ADMIN_PASSWORD;
      const appPassword = process.env.DATABASE_PASSWORD;

      if (!adminPassword || !appPassword) {
        throw new Error(
          'STOP: Missing PostgreSQL test credentials',
        );
      }

      const makeDataSource = (
        username: string,
        password: string,
      ): DataSource =>
        new DataSource({
          ...getPostgresConnectionOptions({
            ...process.env,
            NODE_ENV: 'test',
            DATABASE_HOST: 'localhost',
            DATABASE_PORT: '5432',
            DATABASE_NAME: TEST_DATABASE,
            DATABASE_USER: username,
            DATABASE_PASSWORD: password,
          }),
          entities: [
            join(
              process.cwd(),
              'src',
              'entities',
              '**',
              '*.entity.ts',
            ),
          ],
          synchronize: false,
          migrationsRun: false,
        });

      const admin = makeDataSource(
        'postgres',
        adminPassword,
      );

      const app = makeDataSource(
        'promiseflow_app',
        appPassword,
      );

      const ids = {
        organization: randomUUID(),
        authorizedUser: randomUUID(),
        unauthorizedUser: randomUUID(),
        role: randomUUID(),
        noPermissionRole: randomUUID(),
      };

      const suffix = randomUUID().replace(/-/g, '').slice(0, 12);

      let fixturesCommitted = false;
      let cleanupError: unknown;

      const verifyConnection = async (
        dataSource: DataSource,
        expectedUser: string,
      ): Promise<void> => {
        const [identity] = await dataSource.query(`
          SELECT
            current_database() AS database_name,
            current_user AS database_user
        `);

        if (
          identity.database_name !== TEST_DATABASE ||
          identity.database_user !== expectedUser
        ) {
          throw new Error(
            'STOP: Unexpected PostgreSQL database or role',
          );
        }
      };

      const getCounts = async () => {
        const [result] = await admin.query(
          `
            SELECT
              (
                SELECT count(*)::int
                FROM public.projects
                WHERE organization_id = $1
                  AND deleted_at IS NULL
              ) AS projects,
              (
                SELECT count(*)::int
                FROM public.audit_logs
                WHERE organization_id = $1
                  AND entity_type = 'project'
                  AND action = 'created'
              ) AS audit_logs,
              (
                SELECT count(*)::int
                FROM public.activities
                WHERE organization_id = $1
                  AND entity_type = 'project'
                  AND action = 'created'
              ) AS activities
          `,
          [ids.organization],
        );

        return {
          projects: Number(result.projects),
          audit_logs: Number(result.audit_logs),
          activities: Number(result.activities),
        };
      };

      try {
        await admin.initialize();
        await verifyConnection(admin, 'postgres');

        await app.initialize();
        await verifyConnection(app, 'promiseflow_app');

        const [plan] = await admin.query(
          `
            SELECT
              p.id,
              p.is_active,
              f.is_active AS feature_active,
              f.value_type,
              pf.value
            FROM public.plans p
            JOIN public.plan_features pf
              ON pf.plan_id = p.id
            JOIN public.features f
              ON f.id = pf.feature_id
            WHERE p.slug = 'pro'
              AND f.slug = 'max_projects'
          `,
        );

        if (
          !plan ||
          plan.is_active !== true ||
          plan.feature_active !== true ||
          plan.value_type !== 'number' ||
          plan.value !== '10'
        ) {
          throw new Error(
            'STOP: Expected active Pro plan with max_projects=10',
          );
        }

        // Verify application database permissions before writing.
        const [privileges] = await admin.query(`
          SELECT
            has_table_privilege(
              'promiseflow_app',
              'public.projects',
              'INSERT'
            ) AS can_insert,
            has_table_privilege(
              'promiseflow_app',
              'public.projects',
              'SELECT'
            ) AS can_select
        `);

        if (
          privileges.can_insert !== true ||
          privileges.can_select !== true
        ) {
          throw new Error(
            'STOP: Application project permissions are missing',
          );
        }

        // Create isolated, committed fixtures.
        await admin.transaction(async (manager) => {
          await manager.query(
            `
              INSERT INTO public.organizations
                (id, name, slug)
              VALUES
                ($1, 'Projects Limit Integration Test', $2)
            `,
            [
              ids.organization,
              `projects-limit-${suffix}`,
            ],
          );

          await manager.query(
            `
              INSERT INTO public.users
                (
                  id,
                  first_name,
                  last_name,
                  email,
                  password_hash
                )
              VALUES
                ($1, 'Limit', 'Authorized', $3, 'test-only'),
                ($2, 'Limit', 'Unauthorized', $4, 'test-only')
            `,
            [
              ids.authorizedUser,
              ids.unauthorizedUser,
              `limit-authorized-${suffix}@example.invalid`,
              `limit-unauthorized-${suffix}@example.invalid`,
            ],
          );

          await manager.query(
            `
              INSERT INTO public.roles
                (id, organization_id, name, slug)
              VALUES
                ($1, $2, 'Projects Test Creator', 'creator'),
                ($3, $2, 'Projects Test Viewer', 'viewer')
            `,
            [ids.role, ids.organization, ids.noPermissionRole],
          );

          await manager.query(
            `
              INSERT INTO public.memberships
                (user_id, organization_id, role_id)
              VALUES
                ($1, $3, $4),
                ($2, $3, $5)
            `,
            [
              ids.authorizedUser,
              ids.unauthorizedUser,
              ids.organization,
              ids.role,
              ids.noPermissionRole,
            ],
          );

          const granted = await manager.query(
            `
              INSERT INTO public.role_permissions
                (role_id, permission_id)
              SELECT $1, p.id
              FROM public.permissions p
              WHERE p.slug = 'projects.create'
                AND p.deleted_at IS NULL
              RETURNING role_id
            `,
            [ids.role],
          );

          expect(granted).toHaveLength(1);

          await manager.query(
            `
              INSERT INTO public.subscriptions
                (
                  organization_id,
                  plan_id,
                  status,
                  current_period_start,
                  current_period_end
                )
              VALUES
                (
                  $1,
                  $2,
                  'active',
                  now() - interval '1 day',
                  now() + interval '30 days'
                )
            `,
            [ids.organization, plan.id],
          );

          // Seed nine projects without generating activity records.
          for (let index = 1; index <= 9; index++) {
            await manager.query(
              `
                INSERT INTO public.projects
                  (organization_id, name, slug)
                VALUES ($1, $2, $3)
              `,
              [
                ids.organization,
                `Seed Project ${index}`,
                `seed-${suffix}-${index}`,
              ],
            );
          }
        });

        fixturesCommitted = true;

        const rlsContext = new RlsContextService(app);

        const activitiesService =
          new ActivitiesService(rlsContext);

        const auditLogsService =
          new AuditLogsService(rlsContext);

        const membershipsService =
          new MembershipsService(rlsContext);

        const organizationAccessService =
          new OrganizationAccessService(
            membershipsService,
          );

        const projectsService = new ProjectsService(
          activitiesService,
          auditLogsService,
          rlsContext,
          organizationAccessService,
        );

        expect(await getCounts()).toEqual({
          projects: 9,
          audit_logs: 0,
          activities: 0,
        });

        console.log('PASS: Nine active projects prepared');

        // TEST: A member without projects.create cannot create a project.
        await expect(
          projectsService.create(
            ids.unauthorizedUser,
            ids.organization,
            'Member Without Permission',
            `no-permission-${suffix}`,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(await getCounts()).toEqual({
          projects: 9,
          audit_logs: 0,
          activities: 0,
        });

        console.log('PASS: Member without create permission rejected');

        // TEST: A failed audit write must roll back the saved project.
        // Mock only the audit method; the real project transaction runs.
        const auditFailure = jest
          .spyOn(auditLogsService, 'create')
          .mockRejectedValueOnce(new Error('Simulated audit failure'));

        try {
          await expect(
            projectsService.create(
              ids.authorizedUser,
              ids.organization,
              'Project That Must Roll Back',
              `rollback-${suffix}`,
            ),
          ).rejects.toThrow('Simulated audit failure');
        } finally {
          auditFailure.mockRestore();
        }

        const [rolledBackProject] = await admin.query(
          `
            SELECT count(*)::int AS count
            FROM public.projects
            WHERE organization_id = $1 AND slug = $2
          `,
          [ids.organization, `rollback-${suffix}`],
        );

        expect(Number(rolledBackProject.count)).toBe(0);
        expect(await getCounts()).toEqual({
          projects: 9,
          audit_logs: 0,
          activities: 0,
        });

        console.log('PASS: Audit failure rolled back project creation');

        // TEST 1: Two concurrent requests at the limit boundary.
        const results = await Promise.allSettled([
          projectsService.create(
            ids.authorizedUser,
            ids.organization,
            'Concurrent Project A',
            `concurrent-a-${suffix}`,
          ),
          projectsService.create(
            ids.authorizedUser,
            ids.organization,
            'Concurrent Project B',
            `concurrent-b-${suffix}`,
          ),
        ]);

        const successful = results.filter(
          (result) => result.status === 'fulfilled',
        );

        const rejected = results.filter(
          (result) => result.status === 'rejected',
        );

        expect(successful).toHaveLength(1);
        expect(rejected).toHaveLength(1);

        const failure = rejected[0];

        if (failure.status !== 'rejected') {
          throw new Error('Expected one rejected request');
        }

        expect(failure.reason).toBeInstanceOf(
          ForbiddenException,
        );

        expect(failure.reason.message).toContain(
          'Project limit reached',
        );

        expect(await getCounts()).toEqual({
          projects: 10,
          audit_logs: 1,
          activities: 1,
        });

        console.log(
          'PASS: Concurrent requests respected the limit',
        );

        // TEST 2: A subsequent request must also be rejected.
        await expect(
          projectsService.create(
            ids.authorizedUser,
            ids.organization,
            'Eleventh Project',
            `eleventh-${suffix}`,
          ),
        ).rejects.toThrow('Project limit reached');

        expect(await getCounts()).toEqual({
          projects: 10,
          audit_logs: 1,
          activities: 1,
        });

        console.log('PASS: Eleventh project rejected');

        // TEST 3: A user without membership cannot create.
        await expect(
          projectsService.create(
            randomUUID(),
            ids.organization,
            'Outside User Project',
            `outside-${suffix}`,
          ),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(await getCounts()).toEqual({
          projects: 10,
          audit_logs: 1,
          activities: 1,
        });

        console.log('PASS: Unauthorized user rejected');

        // TEST 4: Verify activity and audit refer to the
        // same successfully created project.
        const [records] = await admin.query(
          `
            SELECT
              (
                SELECT entity_id
                FROM public.audit_logs
                WHERE organization_id = $1
                  AND entity_type = 'project'
                  AND action = 'created'
                LIMIT 1
              ) AS audit_project_id,
              (
                SELECT entity_id
                FROM public.activities
                WHERE organization_id = $1
                  AND entity_type = 'project'
                  AND action = 'created'
                LIMIT 1
              ) AS activity_project_id
          `,
          [ids.organization],
        );

        expect(records.audit_project_id).toBeTruthy();

        expect(records.audit_project_id).toBe(
          records.activity_project_id,
        );

        const [projectExists] = await admin.query(
          `
            SELECT EXISTS (
              SELECT 1
              FROM public.projects
              WHERE id = $1
                AND organization_id = $2
                AND deleted_at IS NULL
            ) AS exists
          `,
          [
            records.audit_project_id,
            ids.organization,
          ],
        );

        expect(projectExists.exists).toBe(true);

        console.log(
          'PASS: Audit and activity reference the committed project',
        );
      } finally {
        if (admin.isInitialized && fixturesCommitted) {
          try {
            await verifyConnection(admin, 'postgres');

            await admin.transaction(async (manager) => {
              // Remove test-owned records before parent rows.
              await manager.query(
                `
                  DELETE FROM public.activities
                  WHERE organization_id = $1
                `,
                [ids.organization],
              );

              await manager.query(
                `
                  DELETE FROM public.audit_logs
                  WHERE organization_id = $1
                `,
                [ids.organization],
              );

              await manager.query(
                `
                  DELETE FROM public.projects
                  WHERE organization_id = $1
                `,
                [ids.organization],
              );

              await manager.query(
                `
                  DELETE FROM public.subscriptions
                  WHERE organization_id = $1
                `,
                [ids.organization],
              );

              await manager.query(
                `
                  DELETE FROM public.role_permissions
                  WHERE role_id IN ($1, $2)
                `,
                [ids.role, ids.noPermissionRole],
              );

              await manager.query(
                `
                  DELETE FROM public.memberships
                  WHERE organization_id = $1
                `,
                [ids.organization],
              );

              await manager.query(
                `
                  DELETE FROM public.roles
                  WHERE id IN ($1, $2)
                `,
                [ids.role, ids.noPermissionRole],
              );

              await manager.query(
                `
                  DELETE FROM public.users
                  WHERE id IN ($1, $2)
                `,
                [
                  ids.authorizedUser,
                  ids.unauthorizedUser,
                ],
              );

              await manager.query(
                `
                  DELETE FROM public.organizations
                  WHERE id = $1
                `,
                [ids.organization],
              );
            });

            const [remaining] = await admin.query(
              `
                SELECT
                  (
                    SELECT count(*)::int
                    FROM public.organizations
                    WHERE id = $1
                  ) AS organizations,
                  (
                    SELECT count(*)::int
                    FROM public.users
                    WHERE id IN ($2, $3)
                  ) AS users,
                  (
                    SELECT count(*)::int
                    FROM public.projects
                    WHERE organization_id = $1
                  ) AS projects,
                  (
                    SELECT count(*)::int
                    FROM public.subscriptions
                    WHERE organization_id = $1
                  ) AS subscriptions,
                  (
                    SELECT count(*)::int
                    FROM public.activities
                    WHERE organization_id = $1
                  ) AS activities,
                  (
                    SELECT count(*)::int
                    FROM public.audit_logs
                    WHERE organization_id = $1
                  ) AS audit_logs
              `,
              [
                ids.organization,
                ids.authorizedUser,
                ids.unauthorizedUser,
              ],
            );

            expect(remaining).toEqual({
              organizations: 0,
              users: 0,
              projects: 0,
              subscriptions: 0,
              activities: 0,
              audit_logs: 0,
            });

            console.log(
              'PASS: Isolated fixtures cleaned and verified',
            );
          } catch (error) {
            cleanupError = error;

            console.error(
              'FAIL: Integration fixture cleanup requires attention',
              error,
            );
          }
        }

        try {
          if (app.isInitialized) {
            await app.destroy();
          }
        } finally {
          if (admin.isInitialized) {
            await admin.destroy();
          }
        }

        if (cleanupError) {
          throw cleanupError;
        }
      }
    },
    60000,
  );
});
