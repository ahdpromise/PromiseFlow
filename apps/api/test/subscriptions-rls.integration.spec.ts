import 'reflect-metadata';
import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { getPostgresConnectionOptions } from '../src/database/postgres-connection.options';
import { RlsContextService } from '../src/database/rls-context.service';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service';

const TEST_DATABASE = 'promiseflow_rls_test';

describe('Subscriptions real PostgreSQL RLS integration', () => {
  it('isolates subscription reads and blocks application writes', async () => {
    if (
      process.env.F03_TEST_DATABASE !== TEST_DATABASE ||
      process.env.DATABASE_NAME !== TEST_DATABASE ||
      process.env.NODE_ENV !== 'test'
    ) {
      throw new Error('STOP: isolated test database and NODE_ENV=test required');
    }

    const adminPassword = process.env.F03_ADMIN_PASSWORD;
    const appPassword = process.env.DATABASE_PASSWORD;
    if (!adminPassword || !appPassword) {
      throw new Error('STOP: admin and application database passwords required');
    }

    const makeDataSource = (username: string, password: string) =>
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
        entities: [join(process.cwd(), 'src', 'entities', '**', '*.entity.ts')],
        synchronize: false,
        migrationsRun: false,
      });

    const admin = makeDataSource('postgres', adminPassword);
    const app = makeDataSource('promiseflow_app', appPassword);
    const ids = {
      orgA: randomUUID(),
      orgB: randomUUID(),
      adminA: randomUUID(),
      adminB: randomUUID(),
      outsider: randomUUID(),
      roleA: randomUUID(),
      roleB: randomUUID(),
      subscriptionA: randomUUID(),
    };
    const suffix = randomUUID().slice(0, 12);
    let cleanupError: unknown;

    try {
      await admin.initialize();
      await app.initialize();
      for (const [connection, expectedRole] of [
        [admin, 'postgres'],
        [app, 'promiseflow_app'],
      ] as const) {
        const [identity] = await connection.query(
          'SELECT current_database() AS db, current_user AS db_user',
        );
        if (identity.db !== TEST_DATABASE || identity.db_user !== expectedRole) {
          throw new Error('STOP: unexpected PostgreSQL database or role');
        }
      }

      await admin.transaction(async (manager) => {
        const [plan] = await manager.query(
          `SELECT id FROM public.plans WHERE slug = 'pro' AND is_active = true`,
        );
        if (!plan?.id) {
          throw new Error('STOP: active Pro plan not found in test database');
        }

        await manager.query(
          `INSERT INTO public.organizations (id, name, slug)
           VALUES ($1, 'Subscriptions RLS A', $3), ($2, 'Subscriptions RLS B', $4)`,
          [ids.orgA, ids.orgB, `sub-rls-a-${suffix}`, `sub-rls-b-${suffix}`],
        );
        await manager.query(
          `INSERT INTO public.users (id, first_name, last_name, email, password_hash)
           VALUES ($1, 'SubRLS', 'AdminA', $4, 'test-only'),
                  ($2, 'SubRLS', 'AdminB', $5, 'test-only'),
                  ($3, 'SubRLS', 'Outsider', $6, 'test-only')`,
          [
            ids.adminA,
            ids.adminB,
            ids.outsider,
            `sub-rls-a-${suffix}@example.invalid`,
            `sub-rls-b-${suffix}@example.invalid`,
            `sub-rls-out-${suffix}@example.invalid`,
          ],
        );
        await manager.query(
          `INSERT INTO public.roles (id, organization_id, name, slug)
           VALUES ($1, $3, 'Administrator', 'administrator'),
                  ($2, $4, 'Administrator', 'administrator')`,
          [ids.roleA, ids.roleB, ids.orgA, ids.orgB],
        );
        await manager.query(
          `INSERT INTO public.memberships (user_id, organization_id, role_id)
           VALUES ($1, $3, $5), ($2, $4, $6)`,
          [ids.adminA, ids.adminB, ids.orgA, ids.orgB, ids.roleA, ids.roleB],
        );
        await manager.query(
          `INSERT INTO public.subscriptions
             (id, organization_id, plan_id, status, current_period_start, current_period_end)
           VALUES ($1, $2, $3, 'active', now(), now() + interval '30 days')`,
          [ids.subscriptionA, ids.orgA, plan.id],
        );
      });

      const service = new SubscriptionsService(new RlsContextService(app));
      const ownById = await service.findById(ids.adminA, ids.subscriptionA);
      expect(ownById.id).toBe(ids.subscriptionA);
      const ownByOrganization = await service.findByOrganizationId(
        ids.adminA,
        ids.orgA,
      );
      expect(ownByOrganization.id).toBe(ids.subscriptionA);

      for (const userId of [ids.adminB, ids.outsider]) {
        await expect(service.findById(userId, ids.subscriptionA)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        await expect(
          service.findByOrganizationId(userId, ids.orgA),
        ).rejects.toBeInstanceOf(NotFoundException);
      }

      const withoutContext = await app.query(
        'SELECT id FROM public.subscriptions WHERE id = $1',
        [ids.subscriptionA],
      );
      expect(withoutContext).toHaveLength(0);

      await expect(
        app.query(
          `UPDATE public.subscriptions SET status = 'canceled' WHERE id = $1`,
          [ids.subscriptionA],
        ),
      ).rejects.toMatchObject({ code: '42501' });

      const [unchanged] = await admin.query(
        'SELECT status FROM public.subscriptions WHERE id = $1',
        [ids.subscriptionA],
      );
      expect(unchanged.status).toBe('active');
    } finally {
      if (admin.isInitialized) {
        try {
          await admin.transaction(async (manager) => {
            await manager.query(
              'DELETE FROM public.subscriptions WHERE id = $1',
              [ids.subscriptionA],
            );
            await manager.query(
              'DELETE FROM public.memberships WHERE user_id IN ($1, $2)',
              [ids.adminA, ids.adminB],
            );
            await manager.query(
              'DELETE FROM public.roles WHERE id IN ($1, $2)',
              [ids.roleA, ids.roleB],
            );
            await manager.query(
              'DELETE FROM public.users WHERE id IN ($1, $2, $3)',
              [ids.adminA, ids.adminB, ids.outsider],
            );
            await manager.query(
              'DELETE FROM public.organizations WHERE id IN ($1, $2)',
              [ids.orgA, ids.orgB],
            );
          });
          const [remaining] = await admin.query(
            `SELECT
               (SELECT count(*)::int FROM public.subscriptions WHERE id = $1) AS subscriptions,
               (SELECT count(*)::int FROM public.memberships WHERE user_id IN ($2, $3)) AS memberships,
               (SELECT count(*)::int FROM public.roles WHERE id IN ($4, $5)) AS roles,
               (SELECT count(*)::int FROM public.users WHERE id IN ($2, $3, $6)) AS users,
               (SELECT count(*)::int FROM public.organizations WHERE id IN ($7, $8)) AS organizations`,
            [
              ids.subscriptionA,
              ids.adminA,
              ids.adminB,
              ids.roleA,
              ids.roleB,
              ids.outsider,
              ids.orgA,
              ids.orgB,
            ],
          );
          expect(remaining).toEqual({
            subscriptions: 0,
            memberships: 0,
            roles: 0,
            users: 0,
            organizations: 0,
          });
        } catch (error) {
          cleanupError = error;
        }
      }
      try {
        if (app.isInitialized) await app.destroy();
      } finally {
        if (admin.isInitialized) await admin.destroy();
      }
      if (cleanupError) throw cleanupError;
    }
  }, 60000);
});
