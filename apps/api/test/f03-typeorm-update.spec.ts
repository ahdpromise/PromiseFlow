
import 'reflect-metadata';

import { join } from 'node:path';
import { DataSource, EntityManager } from 'typeorm';

import { getPostgresConnectionOptions } from '../src/database/postgres-connection.options';
import { RlsContextService } from '../src/database/rls-context.service';
import { ApiKeysService } from '../src/api-keys/api-keys.service';
import { WebhooksService } from '../src/webhooks/webhooks.service';
import { ApiKey } from '../src/entities/api-keys.entity';
import { Webhook } from '../src/entities/webhooks.entity';

const TEST_DB = 'promiseflow_rls_test';

const ORG_A = 'a1000000-0000-4000-8000-000000000001';
const ORG_B = 'a1000000-0000-4000-8000-000000000002';

const ADMIN_A = 'b1000000-0000-4000-8000-000000000001';
const MEMBER_A = 'b1000000-0000-4000-8000-000000000002';
const ADMIN_B = 'b1000000-0000-4000-8000-000000000003';

const ROLE_ADMIN_A = 'c1000000-0000-4000-8000-000000000001';
const ROLE_MEMBER_A = 'c1000000-0000-4000-8000-000000000002';
const ROLE_ADMIN_B = 'c1000000-0000-4000-8000-000000000003';

const WEBHOOK_A = 'd1000000-0000-4000-8000-000000000001';
const WEBHOOK_B = 'd1000000-0000-4000-8000-000000000002';

const API_KEY_A = 'f1000000-0000-4000-8000-000000000001';
const API_KEY_B = 'f1000000-0000-4000-8000-000000000002';

describe('F-03 TypeORM UPDATE Security Integration', () => {
  it(
    'verifies real TypeORM saves under RLS and rolls back fixtures',
    async () => {
      if (process.env.F03_TEST_DATABASE !== TEST_DB) {
        throw new Error(
          'STOP: F03_TEST_DATABASE must be promiseflow_rls_test',
        );
      }

      const adminPassword =
        process.env.F03_ADMIN_PASSWORD;

      if (!adminPassword) {
        throw new Error(
          'STOP: F03_ADMIN_PASSWORD is required',
        );
      }

      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'STOP: Production environment is forbidden',
        );
      }

      const dataSource = new DataSource({
        ...getPostgresConnectionOptions({
          ...process.env,
          NODE_ENV: 'test',
          DATABASE_NAME: TEST_DB,
          DATABASE_USER: 'postgres',
          DATABASE_PASSWORD: adminPassword,
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

      let transactionStarted = false;

      const runner = dataSource.createQueryRunner();

      try {
        await dataSource.initialize();
        await runner.connect();

        const [identity] = await runner.query(`
          SELECT
            current_database() AS database_name,
            current_user AS database_user
        `);

        if (
          identity.database_name !== TEST_DB ||
          identity.database_user !== 'postgres'
        ) {
          throw new Error(
            'STOP: Unexpected database or administrator',
          );
        }

        await runner.startTransaction();
        transactionStarted = true;

        const manager = runner.manager;

        // Create fixtures as the PostgreSQL administrator.
        // All fixture changes remain uncommitted.

        await manager.query(
          `
          INSERT INTO public.organizations
            (id, name, slug)
          VALUES
            ($1, 'F03 ORM Organization A', 'f03-orm-org-a'),
            ($2, 'F03 ORM Organization B', 'f03-orm-org-b')
          `,
          [ORG_A, ORG_B],
        );

        await manager.query(
          `
          INSERT INTO public.users
            (id, first_name, last_name, email, password_hash)
          VALUES
            ($1, 'Test', 'AdminA', 'f03-orm-admin-a@example.invalid', 'test-only'),
            ($2, 'Test', 'MemberA', 'f03-orm-member-a@example.invalid', 'test-only'),
            ($3, 'Test', 'AdminB', 'f03-orm-admin-b@example.invalid', 'test-only')
          `,
          [ADMIN_A, MEMBER_A, ADMIN_B],
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
            ROLE_ADMIN_A,
            ROLE_MEMBER_A,
            ROLE_ADMIN_B,
            ORG_A,
            ORG_B,
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
            ADMIN_A,
            MEMBER_A,
            ADMIN_B,
            ORG_A,
            ORG_B,
            ROLE_ADMIN_A,
            ROLE_MEMBER_A,
            ROLE_ADMIN_B,
          ],
        );

        const permissionsResult = await manager.query(
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
          [ROLE_ADMIN_A, ROLE_ADMIN_B],
        );

        expect(permissionsResult.length).toBe(4);

        await manager.query(
          `
          INSERT INTO public.api_keys
            (id, organization_id, name, key_prefix, key_hash)
          VALUES
            ($1, $3, 'F03 ORM API Key A', 'f03_orm_a', 'f03-orm-hash-a'),
            ($2, $4, 'F03 ORM API Key B', 'f03_orm_b', 'f03-orm-hash-b')
          `,
          [API_KEY_A, API_KEY_B, ORG_A, ORG_B],
        );

        await manager.query(
          `
          INSERT INTO public.webhooks
            (id, organization_id, name, url, secret, events)
          VALUES
            ($1, $3, 'F03 ORM Webhook A',
             'https://example.invalid/a',
             'f03-orm-secret-a', '["task.created"]'),
            ($2, $4, 'F03 ORM Webhook B',
             'https://example.invalid/b',
             'f03-orm-secret-b', '["task.created"]')
          `,
          [WEBHOOK_A, WEBHOOK_B, ORG_A, ORG_B],
        );

        console.log('PASS: Test fixtures created');

        /*
         * The real services use RlsContextService.run().
         *
         * This test replaces only the transaction wrapper,
         * so the services receive the real TypeORM manager
         * attached to the outer rollback-only transaction.
         *
         * Each call switches to promiseflow_app and sets
         * app.user_id exactly as the application requires.
         */

        const runAs = async <T>(
          userId: string,
          callback: (entityManager: EntityManager) => Promise<T>,
        ): Promise<T> => {
          await manager.query(
            'SAVEPOINT f03_orm_role_scope',
          );

          try {
            await manager.query(
              'SET LOCAL ROLE promiseflow_app',
            );

            await manager.query(
              `SELECT set_config('app.user_id', $1, true)`,
              [userId],
            );

            const [identity] = await manager.query(`
              SELECT current_user AS database_user
            `);

            if (
              identity.database_user !== 'promiseflow_app'
            ) {
              throw new Error(
                'STOP: Application role was not activated',
              );
            }

            return await callback(manager);
          } finally {
            await manager.query(
              'ROLLBACK TO SAVEPOINT f03_orm_role_scope',
            );

            await manager.query(
              'RELEASE SAVEPOINT f03_orm_role_scope',
            );
          }
        };

        const testRlsContext = {
          run: runAs,
        } as RlsContextService;

        const apiKeysService =
          new ApiKeysService(testRlsContext);

        const webhooksService =
          new WebhooksService(testRlsContext);

        // TEST 1: Authorized Webhook update through TypeORM.

        const updatedWebhook =
          await webhooksService.update(
            ADMIN_A,
            WEBHOOK_A,
            {
              name: 'F03 ORM Webhook Updated',
              is_active: false,
            },
          );

        expect(updatedWebhook.id).toBe(WEBHOOK_A);
        expect(updatedWebhook.name).toBe(
          'F03 ORM Webhook Updated',
        );
        expect(updatedWebhook.is_active).toBe(false);

        console.log(
          'PASS: Administrator A TypeORM webhook update',
        );

        // TEST 2: Authorized API key revoke through TypeORM.

        const revokedKey =
          await apiKeysService.revoke(
            ADMIN_A,
            API_KEY_A,
          );

        expect(revokedKey.id).toBe(API_KEY_A);
        expect(revokedKey.revoked_at).not.toBeNull();

        console.log(
          'PASS: Administrator A TypeORM API key revoke',
        );

        // TEST 3: Authorized Webhook deactivation.

        const deactivatedWebhook =
          await webhooksService.deactivate(
            ADMIN_A,
            WEBHOOK_A,
          );

        expect(deactivatedWebhook.id).toBe(WEBHOOK_A);
        expect(deactivatedWebhook.is_active).toBe(false);

        console.log(
          'PASS: Administrator A TypeORM webhook deactivate',
        );

        // TEST 4: Member A must not update Webhook A.

        await expect(
          webhooksService.update(
            MEMBER_A,
            WEBHOOK_A,
            { name: 'Forbidden Member Update' },
          ),
        ).rejects.toThrow();

        console.log(
          'PASS: Member A webhook update rejected',
        );

        // TEST 5: Member A must not revoke API Key A.

        await expect(
          apiKeysService.revoke(
            MEMBER_A,
            API_KEY_A,
          ),
        ).rejects.toThrow();

        console.log(
          'PASS: Member A API key revoke rejected',
        );

        // TEST 6: Admin B must not update Webhook A.

        await expect(
          webhooksService.update(
            ADMIN_B,
            WEBHOOK_A,
            { name: 'Forbidden Cross-Tenant Update' },
          ),
        ).rejects.toThrow();

        console.log(
          'PASS: Administrator B cross-tenant webhook update rejected',
        );

        // TEST 7: Admin B must not revoke API Key A.

        await expect(
          apiKeysService.revoke(
            ADMIN_B,
            API_KEY_A,
          ),
        ).rejects.toThrow();

        console.log(
          'PASS: Administrator B cross-tenant API key revoke rejected',
        );

        // Verify fixture values are unchanged.
        // Each runAs() call rolls back to its savepoint.

        const webhook = await manager
          .getRepository(Webhook)
          .findOneByOrFail({ id: WEBHOOK_A });

        const apiKey = await manager
          .getRepository(ApiKey)
          .findOneByOrFail({ id: API_KEY_A });

        expect(webhook.name).toBe('F03 ORM Webhook A');
        expect(webhook.is_active).toBe(true);
        expect(apiKey.revoked_at).toBeNull();

        console.log(
          'PASS: Original fixture values preserved',
        );
      } finally {
        if (transactionStarted) {
          try {
            await runner.rollbackTransaction();
            console.log(
              'PASS: Outer transaction rolled back',
            );
          } finally {
            await runner.release();
          }
        } else if (!runner.isReleased) {
          await runner.release();
        }

        if (dataSource.isInitialized) {
          await dataSource.destroy();
        }
      }
    },
    60000,
  );
});
