
import 'reflect-metadata';
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { getPostgresConnectionOptions } from '../src/database/postgres-connection.options';
import { RlsContextService } from '../src/database/rls-context.service';
import { ApiKeysService } from '../src/api-keys/api-keys.service';
import { WebhooksService } from '../src/webhooks/webhooks.service';
import { Webhook } from '../src/entities/webhooks.entity';

const TEST_DATABASE = 'promiseflow_rls_test';

describe('F-03 Real RlsContextService Integration', () => {
  it(
    'verifies COMMIT, ROLLBACK and tenant permissions',
    async () => {
      if (
        process.env.F03_TEST_DATABASE !== TEST_DATABASE ||
        process.env.NODE_ENV === 'production'
      ) {
        throw new Error(
          'STOP: F-03 requires the isolated test database',
        );
      }

      const adminPassword = process.env.F03_ADMIN_PASSWORD;
      const appPassword = process.env.DATABASE_PASSWORD;

      if (!adminPassword || !appPassword) {
        throw new Error(
          'STOP: PostgreSQL admin and application passwords are required',
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
        orgA: randomUUID(),
        orgB: randomUUID(),
        adminA: randomUUID(),
        memberA: randomUUID(),
        adminB: randomUUID(),
        roleAdminA: randomUUID(),
        roleMemberA: randomUUID(),
        roleAdminB: randomUUID(),
        webhookA: randomUUID(),
        webhookB: randomUUID(),
        apiKeyA: randomUUID(),
        apiKeyB: randomUUID(),
      };

      const suffix = randomUUID().slice(0, 12);

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

      let cleanupError: unknown;

      try {
        await admin.initialize();
        await verifyConnection(admin, 'postgres');

        await app.initialize();
        await verifyConnection(app, 'promiseflow_app');

        // Prepare committed fixtures in the isolated database.
        // The application connection can then see them.

        await admin.transaction(async (manager) => {
          await manager.query(
            `
            INSERT INTO public.organizations
              (id, name, slug)
            VALUES
              ($1, 'F03 Integration Organization A', $3),
              ($2, 'F03 Integration Organization B', $4)
            `,
            [
              ids.orgA,
              ids.orgB,
              `f03-integration-a-${suffix}`,
              `f03-integration-b-${suffix}`,
            ],
          );

          await manager.query(
            `
            INSERT INTO public.users
              (id, first_name, last_name, email, password_hash)
            VALUES
              ($1, 'F03', 'AdminA', $4, 'test-only'),
              ($2, 'F03', 'MemberA', $5, 'test-only'),
              ($3, 'F03', 'AdminB', $6, 'test-only')
            `,
            [
              ids.adminA,
              ids.memberA,
              ids.adminB,
              `f03-admin-a-${suffix}@example.invalid`,
              `f03-member-a-${suffix}@example.invalid`,
              `f03-admin-b-${suffix}@example.invalid`,
            ],
          );

          await manager.query(
            `
            INSERT INTO public.roles
              (id, organization_id, name, slug)
            VALUES
              ($1, $4, 'Administrator', 'administrator'),
              ($2, $4, 'Member', 'member'),
              ($3, $5, 'Administrator', 'administrator')
            `,
            [
              ids.roleAdminA,
              ids.roleMemberA,
              ids.roleAdminB,
              ids.orgA,
              ids.orgB,
            ],
          );

          await manager.query(
            `
            INSERT INTO public.memberships
              (user_id, organization_id, role_id)
            VALUES
              ($1, $4, $6),
              ($2, $4, $7),
              ($3, $5, $8)
            `,
            [
              ids.adminA,
              ids.memberA,
              ids.adminB,
              ids.orgA,
              ids.orgB,
              ids.roleAdminA,
              ids.roleMemberA,
              ids.roleAdminB,
            ],
          );

          const granted = await manager.query(
            `
            INSERT INTO public.role_permissions
              (role_id, permission_id)
            SELECT r.id, p.id
            FROM public.roles r
            CROSS JOIN public.permissions p
            WHERE r.id IN ($1, $2)
              AND p.slug IN (
                'api_keys.manage',
                'webhooks.manage'
              )
              AND p.deleted_at IS NULL
            RETURNING role_id
            `,
            [ids.roleAdminA, ids.roleAdminB],
          );

          expect(granted).toHaveLength(4);

          await manager.query(
            `
            INSERT INTO public.webhooks
              (id, organization_id, name, url, secret, events)
            VALUES
              ($1, $3, 'F03 Real Webhook A',
               'https://example.invalid/a',
               'test-secret-a', '["task.created"]'),
              ($2, $4, 'F03 Real Webhook B',
               'https://example.invalid/b',
               'test-secret-b', '["task.created"]')
            `,
            [
              ids.webhookA,
              ids.webhookB,
              ids.orgA,
              ids.orgB,
            ],
          );

          await manager.query(
            `
            INSERT INTO public.api_keys
              (id, organization_id, name, key_prefix, key_hash)
            VALUES
              ($1, $3, 'F03 Real API Key A',
               'f03_real_a', 'f03-real-hash-a'),
              ($2, $4, 'F03 Real API Key B',
               'f03_real_b', 'f03-real-hash-b')
            `,
            [
              ids.apiKeyA,
              ids.apiKeyB,
              ids.orgA,
              ids.orgB,
            ],
          );
        });

        console.log('PASS: Isolated fixtures committed');

        const rlsContext = new RlsContextService(app);
        const webhooksService =
          new WebhooksService(rlsContext);
        const apiKeysService =
          new ApiKeysService(rlsContext);

        // TEST 1: Real service COMMIT.

        await webhooksService.update(
          ids.adminA,
          ids.webhookA,
          { name: 'F03 Committed Update' },
        );

        const [committed] = await admin.query(
          `
          SELECT name
          FROM public.webhooks
          WHERE id = $1
          `,
          [ids.webhookA],
        );

        expect(committed.name).toBe(
          'F03 Committed Update',
        );

        console.log('PASS: Real COMMIT persisted');

        // TEST 2: Real service ROLLBACK.
        // Throw after an actual TypeORM save.

        await expect(
          rlsContext.run(ids.adminA, async (manager) => {
            const repository =
              manager.getRepository(Webhook);

            const webhook =
              await repository.findOneByOrFail({
                id: ids.webhookA,
              });

            webhook.name = 'F03 Must Roll Back';

            await repository.save(webhook);

            throw new Error('F03 intentional rollback');
          }),
        ).rejects.toThrow('F03 intentional rollback');

        const [afterRollback] = await admin.query(
          `
          SELECT name
          FROM public.webhooks
          WHERE id = $1
          `,
          [ids.webhookA],
        );

        expect(afterRollback.name).toBe(
          'F03 Committed Update',
        );

        console.log('PASS: Real ROLLBACK restored value');

        // TEST 3: Member A lacks management permission.

        await expect(
          webhooksService.update(
            ids.memberA,
            ids.webhookA,
            { name: 'Forbidden Member Update' },
          ),
        ).rejects.toBeInstanceOf(NotFoundException);

        await expect(
          apiKeysService.revoke(
            ids.memberA,
            ids.apiKeyA,
          ),
        ).rejects.toBeInstanceOf(NotFoundException);

        console.log('PASS: Member permission enforcement');

        // TEST 4: Admin B cannot modify Organization A.

        await expect(
          webhooksService.update(
            ids.adminB,
            ids.webhookA,
            { name: 'Forbidden Tenant Update' },
          ),
        ).rejects.toBeInstanceOf(NotFoundException);

        await expect(
          apiKeysService.revoke(
            ids.adminB,
            ids.apiKeyA,
          ),
        ).rejects.toBeInstanceOf(NotFoundException);

        console.log('PASS: Cross-tenant isolation');

        // TEST 5: Real API key revoke COMMIT.

        await apiKeysService.revoke(
          ids.adminA,
          ids.apiKeyA,
        );

        const [keyState] = await admin.query(
          `
          SELECT revoked_at
          FROM public.api_keys
          WHERE id = $1
          `,
          [ids.apiKeyA],
        );

        expect(keyState.revoked_at).not.toBeNull();

        console.log('PASS: API key revoke committed');

        // TEST 6: Unauthorized attempts changed nothing.

        const [finalWebhook] = await admin.query(
          `
          SELECT name
          FROM public.webhooks
          WHERE id = $1
          `,
          [ids.webhookA],
        );

        expect(finalWebhook.name).toBe(
          'F03 Committed Update',
        );

        console.log(
          'PASS: Unauthorized attempts preserved data',
        );
      } finally {
        if (admin.isInitialized) {
          try {
            await admin.transaction(async (manager) => {
              await manager.query(
                `DELETE FROM public.api_keys WHERE id IN ($1, $2)`,
                [ids.apiKeyA, ids.apiKeyB],
              );

              await manager.query(
                `DELETE FROM public.webhooks WHERE id IN ($1, $2)`,
                [ids.webhookA, ids.webhookB],
              );

              await manager.query(
                `DELETE FROM public.role_permissions
                 WHERE role_id IN ($1, $2, $3)`,
                [
                  ids.roleAdminA,
                  ids.roleMemberA,
                  ids.roleAdminB,
                ],
              );

              await manager.query(
                `DELETE FROM public.memberships
                 WHERE user_id IN ($1, $2, $3)`,
                [
                  ids.adminA,
                  ids.memberA,
                  ids.adminB,
                ],
              );

              await manager.query(
                `DELETE FROM public.roles
                 WHERE id IN ($1, $2, $3)`,
                [
                  ids.roleAdminA,
                  ids.roleMemberA,
                  ids.roleAdminB,
                ],
              );

              await manager.query(
                `DELETE FROM public.users
                 WHERE id IN ($1, $2, $3)`,
                [
                  ids.adminA,
                  ids.memberA,
                  ids.adminB,
                ],
              );

              await manager.query(
                `DELETE FROM public.organizations
                 WHERE id IN ($1, $2)`,
                [ids.orgA, ids.orgB],
              );
            });

            const [remaining] = await admin.query(
              `
              SELECT
                (SELECT count(*)::int
                 FROM public.organizations
                 WHERE id IN ($1, $2)) AS organizations,
                (SELECT count(*)::int
                 FROM public.users
                 WHERE id IN ($3, $4, $5)) AS users,
                (SELECT count(*)::int
                 FROM public.webhooks
                 WHERE id IN ($6, $7)) AS webhooks,
                (SELECT count(*)::int
                 FROM public.api_keys
                 WHERE id IN ($8, $9)) AS api_keys
              `,
              [
                ids.orgA,
                ids.orgB,
                ids.adminA,
                ids.memberA,
                ids.adminB,
                ids.webhookA,
                ids.webhookB,
                ids.apiKeyA,
                ids.apiKeyB,
              ],
            );

            expect(remaining).toEqual({
              organizations: 0,
              users: 0,
              webhooks: 0,
              api_keys: 0,
            });

            console.log(
              'PASS: Test fixtures cleaned and verified',
            );
          } catch (error) {
            cleanupError = error;
            console.error(
              'FAIL: Fixture cleanup requires attention',
              error,
            );
          }
        }

        if (app.isInitialized) {
          await app.destroy();
        }

        if (admin.isInitialized) {
          await admin.destroy();
        }

        if (cleanupError) {
          throw cleanupError;
        }
      }
    },
    60000,
  );
});
