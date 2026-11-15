
import 'dotenv/config';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from '@jest/globals';

import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import type { DataSource } from 'typeorm';
import type { Client as PgClientType } from 'pg';
import type { App } from 'supertest/types';

import request from 'supertest';

const TEST_DATABASE = 'promiseflow_rls_test';
const APP_DATABASE_USER = 'promiseflow_app';

const fixtureTag = randomUUID().replace(/-/g, '');

const userAId = randomUUID();
const userBId = randomUUID();

const organizationAId = randomUUID();
const organizationBId = randomUUID();

const roleAId = randomUUID();
const roleBId = randomUUID();

const planId = randomUUID();

const subscriptionAId = randomUUID();
const subscriptionBId = randomUUID();

const userAEmail = `subscription-a-${fixtureTag}@e2e.invalid`;
const userBEmail = `subscription-b-${fixtureTag}@e2e.invalid`;

type DatabaseIdentity = {
  database_name: string;
  database_user: string;
};

describe('Subscriptions Security and RLS (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let moduleFixture: TestingModule | undefined;

  let tokenA: string;
  let tokenB: string;

  let fixtureCreated = false;

  const assertSafeEnvironment = (): void => {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.DATABASE_NAME !== TEST_DATABASE ||
      process.env.DATABASE_USER !== APP_DATABASE_USER ||
      !process.env.DATABASE_PASSWORD ||
      !process.env.TEST_DB_ADMIN_PASSWORD ||
      !process.env.JWT_SECRET
    ) {
      throw new Error(
        'SUBSCRIPTIONS E2E SAFETY CHECK FAILED: Invalid test environment.',
      );
    }
  };

  const createAdminClient =
    async (): Promise<PgClientType> => {
      assertSafeEnvironment();

      const { Client } = await import('pg');

      const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: Number(process.env.DATABASE_PORT || 5432),
        database: TEST_DATABASE,
        user: 'postgres',
        password: process.env.TEST_DB_ADMIN_PASSWORD,
        connectionTimeoutMillis: 10000,
      });

      await client.connect();

      try {
        const result =
          await client.query<DatabaseIdentity>(`
            SELECT
              current_database() AS database_name,
              current_user AS database_user
          `);

        if (
          result.rows.length !== 1 ||
          result.rows[0].database_name !== TEST_DATABASE ||
          result.rows[0].database_user !== 'postgres'
        ) {
          throw new Error(
            'SUBSCRIPTIONS E2E SAFETY CHECK FAILED: Unexpected admin connection.',
          );
        }

        return client;
      } catch (error) {
        await client.end();
        throw error;
      }
    };

  const setupFixture = async (): Promise<void> => {
    const client = await createAdminClient();

    try {
      await client.query('BEGIN');

      await client.query(
        `
          INSERT INTO public.users (
            id,
            first_name,
            last_name,
            email,
            password_hash
          )
          VALUES
            ($1, 'Subscription', 'User A', $2, $5),
            ($3, 'Subscription', 'User B', $4, $5)
        `,
        [
          userAId,
          userAEmail,
          userBId,
          userBEmail,
          'e2e-jwt-only-no-password-login',
        ],
      );

      await client.query(
        `
          INSERT INTO public.organizations (
            id,
            name,
            slug
          )
          VALUES
            ($1, 'Subscription E2E Organization A', $3),
            ($2, 'Subscription E2E Organization B', $4)
        `,
        [
          organizationAId,
          organizationBId,
          `subscription-a-${fixtureTag}`,
          `subscription-b-${fixtureTag}`,
        ],
      );

      await client.query(
        `
          INSERT INTO public.roles (
            id,
            organization_id,
            name,
            slug
          )
          VALUES
            ($1, $3, 'Member', 'member'),
            ($2, $4, 'Member', 'member')
        `,
        [
          roleAId,
          roleBId,
          organizationAId,
          organizationBId,
        ],
      );

      await client.query(
        `
          INSERT INTO public.memberships (
            user_id,
            organization_id,
            role_id
          )
          VALUES
            ($1, $3, $5),
            ($2, $4, $6)
        `,
        [
          userAId,
          userBId,
          organizationAId,
          organizationBId,
          roleAId,
          roleBId,
        ],
      );

      await client.query(
        `
          INSERT INTO public.plans (
            id,
            name,
            slug,
            description,
            price,
            currency,
            billing_interval,
            is_active
          )
          VALUES (
            $1,
            'Subscription E2E Plan',
            $2,
            'Temporary plan for subscription security tests',
            0,
            'EUR',
            'month',
            true
          )
        `,
        [
          planId,
          `subscription-e2e-${fixtureTag}`,
        ],
      );

      await client.query(
        `
          INSERT INTO public.subscriptions (
            id,
            organization_id,
            plan_id,
            status,
            current_period_start,
            current_period_end,
            cancel_at_period_end
          )
          VALUES
            (
              $1, $3, $5, 'active',
              '2026-11-01T00:00:00Z',
              '2026-12-01T00:00:00Z',
              false
            ),
            (
              $2, $4, $5, 'active',
              '2026-11-01T00:00:00Z',
              '2026-12-01T00:00:00Z',
              false
            )
        `,
        [
          subscriptionAId,
          subscriptionBId,
          organizationAId,
          organizationBId,
          planId,
        ],
      );

      await client.query('COMMIT');
      fixtureCreated = true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  };

  const cleanupFixture = async (): Promise<void> => {
    if (!fixtureCreated) {
      return;
    }

    const client = await createAdminClient();

    try {
      await client.query('BEGIN');

      await client.query(
        `
          DELETE FROM public.audit_logs
          WHERE organization_id = ANY($1::uuid[])
        `,
        [[organizationAId, organizationBId]],
      );

      await client.query(
        `
          DELETE FROM public.activities
          WHERE organization_id = ANY($1::uuid[])
        `,
        [[organizationAId, organizationBId]],
      );

      await client.query(
        `
          DELETE FROM public.subscriptions
          WHERE id = ANY($1::uuid[])
        `,
        [[subscriptionAId, subscriptionBId]],
      );

      await client.query(
        `
          DELETE FROM public.memberships
          WHERE organization_id = ANY($1::uuid[])
        `,
        [[organizationAId, organizationBId]],
      );

      await client.query(
        `
          DELETE FROM public.role_permissions
          WHERE role_id = ANY($1::uuid[])
        `,
        [[roleAId, roleBId]],
      );

      await client.query(
        `
          DELETE FROM public.roles
          WHERE id = ANY($1::uuid[])
        `,
        [[roleAId, roleBId]],
      );

      await client.query(
        `
          DELETE FROM public.organizations
          WHERE id = ANY($1::uuid[])
        `,
        [[organizationAId, organizationBId]],
      );

      await client.query(
        `
          DELETE FROM public.users
          WHERE id = ANY($1::uuid[])
        `,
        [[userAId, userBId]],
      );

      await client.query(
        `
          DELETE FROM public.plans
          WHERE id = $1
        `,
        [planId],
      );

      await client.query('COMMIT');
      fixtureCreated = false;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  };

  beforeAll(async () => {
    assertSafeEnvironment();

    const [
      { Test },
      { AppModule },
      { getDataSourceToken },
    ] = await Promise.all([
      import('@nestjs/testing'),
      import('../src/app.module.js'),
      import('@nestjs/typeorm'),
    ]);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const dataSource = moduleFixture.get<DataSource>(
      getDataSourceToken(),
    );

    const identity: DatabaseIdentity[] =
      await dataSource.query(`
        SELECT
          current_database() AS database_name,
          current_user AS database_user
      `);

    if (
      identity.length !== 1 ||
      identity[0].database_name !== TEST_DATABASE ||
      identity[0].database_user !== APP_DATABASE_USER
    ) {
      throw new Error(
        'SUBSCRIPTIONS E2E SAFETY CHECK FAILED: Unexpected app connection.',
      );
    }

    await setupFixture();

    const jwtService = moduleFixture.get(JwtService);

    tokenA = jwtService.sign({
      sub: userAId,
      email: userAEmail,
    });

    tokenB = jwtService.sign({
      sub: userBId,
      email: userBEmail,
    });

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  it('rejects POST without authentication', async () => {
    await request(app!.getHttpServer())
      .post('/subscriptions')
      .send({
        organization_id: organizationAId,
        plan_id: planId,
        status: 'active',
      })
      .expect(401);
  });

  it('rejects POST with an active user', async () => {
    await request(app!.getHttpServer())
      .post('/subscriptions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        organization_id: organizationAId,
        plan_id: planId,
        status: 'active',
      })
      .expect(403);
  });

  it('rejects PATCH without authentication', async () => {
    await request(app!.getHttpServer())
      .patch(`/subscriptions/${subscriptionAId}`)
      .send({ status: 'canceled' })
      .expect(401);
  });

  it('rejects PATCH with an active user', async () => {
    await request(app!.getHttpServer())
      .patch(`/subscriptions/${subscriptionAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'canceled' })
      .expect(403);
  });

  it('rejects GET without authentication', async () => {
    await request(app!.getHttpServer())
      .get(`/subscriptions/${subscriptionAId}`)
      .expect(401);
  });

  it('rejects organization GET without authentication', async () => {
    await request(app!.getHttpServer())
      .get(
        `/subscriptions/organization/${organizationAId}`,
      )
      .expect(401);
  });

  it('allows User A to read Subscription A', async () => {
    const response = await request(app!.getHttpServer())
      .get(`/subscriptions/${subscriptionAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body.id).toBe(subscriptionAId);
    expect(response.body.organization_id).toBe(
      organizationAId,
    );
  });

  it('hides Subscription B from User A', async () => {
    await request(app!.getHttpServer())
      .get(`/subscriptions/${subscriptionBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('allows User B to read Subscription B', async () => {
    const response = await request(app!.getHttpServer())
      .get(`/subscriptions/${subscriptionBId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(response.body.id).toBe(subscriptionBId);
    expect(response.body.organization_id).toBe(
      organizationBId,
    );
  });

  it('hides Subscription A from User B', async () => {
    await request(app!.getHttpServer())
      .get(`/subscriptions/${subscriptionAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('allows User A to read Organization A subscription', async () => {
    const response = await request(app!.getHttpServer())
      .get(
        `/subscriptions/organization/${organizationAId}`,
      )
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body.id).toBe(subscriptionAId);
  });

  it('hides Organization B subscription from User A', async () => {
    await request(app!.getHttpServer())
      .get(
        `/subscriptions/organization/${organizationBId}`,
      )
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(404);
  });

  it('allows User B to read Organization B subscription', async () => {
    const response = await request(app!.getHttpServer())
      .get(
        `/subscriptions/organization/${organizationBId}`,
      )
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(response.body.id).toBe(subscriptionBId);
  });

  it('hides Organization A subscription from User B', async () => {
    await request(app!.getHttpServer())
      .get(
        `/subscriptions/organization/${organizationAId}`,
      )
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      } else if (moduleFixture) {
        await moduleFixture.close();
      }
    } finally {
      await cleanupFixture();
    }
  }, 30000);
});
