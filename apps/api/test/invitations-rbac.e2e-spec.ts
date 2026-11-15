
import 'dotenv/config';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import type { DataSource } from 'typeorm';
import type { App } from 'supertest/types';
import type { Client as PgClientType } from 'pg';

import request from 'supertest';

const TEST_DATABASE = 'promiseflow_rls_test';
const APP_DATABASE_USER = 'promiseflow_app';

const organizationId = randomUUID();
const administratorRoleId = randomUUID();
const managerRoleId = randomUUID();
const limitedRoleId = randomUUID();

const administratorUserId = randomUUID();
const managerUserId = randomUUID();
const limitedUserId = randomUUID();

const fixtureTag = randomUUID().replace(/-/g, '');

const organizationSlug = `rbac-e2e-${fixtureTag}`;

const administratorEmail =
  `rbac-admin-${fixtureTag}@e2e.invalid`;
const managerEmail =
  `rbac-manager-${fixtureTag}@e2e.invalid`;
const limitedEmail =
  `rbac-limited-${fixtureTag}@e2e.invalid`;
const inviteeEmail =
  `rbac-invitee-${fixtureTag}@e2e.invalid`;

type DatabaseIdentity = {
  database_name: string;
  database_user: string;
};

type PermissionRow = {
  id: string;
  slug: string;
};

describe('Invitations RBAC (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let moduleFixture: TestingModule | undefined;
  let dataSource: DataSource | undefined;

  let administratorToken: string;
  let managerToken: string;
  let limitedToken: string;

  let fixtureCreated = false;

  const sendInvitationMock = jest.fn<
    (email: string, token: string) => Promise<void>
  >();

  const assertSafeEnvironment = (): void => {
    if (
      process.env.NODE_ENV === 'production' ||
      process.env.DATABASE_NAME !== TEST_DATABASE ||
      process.env.DATABASE_USER !== APP_DATABASE_USER
    ) {
      throw new Error(
        'RBAC E2E SAFETY CHECK FAILED: Invalid environment.',
      );
    }

    if (
      !process.env.DATABASE_PASSWORD ||
      !process.env.TEST_DB_ADMIN_PASSWORD ||
      !process.env.JWT_SECRET
    ) {
      throw new Error(
        'RBAC E2E requires database credentials and JWT_SECRET.',
      );
    }
  };

  const createAdminClient = async (): Promise<PgClientType> => {
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
      const result = await client.query<DatabaseIdentity>(`
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
          'RBAC E2E SAFETY CHECK FAILED: Unexpected admin connection.',
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

      const permissions = await client.query<PermissionRow>(`
        SELECT id, slug
        FROM public.permissions
        WHERE slug IN ('members.manage', 'roles.manage')
          AND deleted_at IS NULL
      `);

      const membersManage = permissions.rows.find(
        (permission) => permission.slug === 'members.manage',
      );

      const rolesManage = permissions.rows.find(
        (permission) => permission.slug === 'roles.manage',
      );

      if (
        permissions.rows.length !== 2 ||
        !membersManage ||
        !rolesManage
      ) {
        throw new Error(
          'Required RBAC permissions are missing.',
        );
      }

      await client.query(
        `
          INSERT INTO public.users (
            id, first_name, last_name, email, password_hash
          )
          VALUES
            ($1, 'RBAC', 'Administrator', $2, $7),
            ($3, 'RBAC', 'Manager', $4, $7),
            ($5, 'RBAC', 'Limited', $6, $7)
        `,
        [
          administratorUserId,
          administratorEmail,
          managerUserId,
          managerEmail,
          limitedUserId,
          limitedEmail,
          'e2e-jwt-only-no-password-login',
        ],
      );

      await client.query(
        `
          INSERT INTO public.organizations (id, name, slug)
          VALUES ($1, $2, $3)
        `,
        [
          organizationId,
          'RBAC E2E Test Organization',
          organizationSlug,
        ],
      );

      await client.query(
        `
          INSERT INTO public.roles (
            id, organization_id, name, slug
          )
          VALUES
            ($1, $4, 'Administrator', 'administrator'),
            ($2, $4, 'Invitation Manager', 'invitation-manager'),
            ($3, $4, 'Limited Member', 'limited-member')
        `,
        [
          administratorRoleId,
          managerRoleId,
          limitedRoleId,
          organizationId,
        ],
      );

      await client.query(
        `
          INSERT INTO public.memberships (
            user_id, organization_id, role_id
          )
          VALUES
            ($1, $4, $5),
            ($2, $4, $6),
            ($3, $4, $7)
        `,
        [
          administratorUserId,
          managerUserId,
          limitedUserId,
          organizationId,
          administratorRoleId,
          managerRoleId,
          limitedRoleId,
        ],
      );

      await client.query(
        `
          INSERT INTO public.role_permissions (
            role_id, permission_id
          )
          VALUES
            ($1, $3),
            ($1, $4),
            ($2, $3)
        `,
        [
          administratorRoleId,
          managerRoleId,
          membersManage.id,
          rolesManage.id,
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
          WHERE organization_id = $1
        `,
        [organizationId],
      );

      await client.query(
        `
          DELETE FROM public.activities
          WHERE organization_id = $1
        `,
        [organizationId],
      );

      await client.query(
        `
          DELETE FROM public.invitations
          WHERE organization_id = $1
        `,
        [organizationId],
      );

      await client.query(
        `
          DELETE FROM public.role_permissions
          WHERE role_id = ANY($1::uuid[])
        `,
        [[administratorRoleId, managerRoleId, limitedRoleId]],
      );

      await client.query(
        `
          DELETE FROM public.memberships
          WHERE organization_id = $1
        `,
        [organizationId],
      );

      await client.query(
        `
          DELETE FROM public.roles
          WHERE organization_id = $1
        `,
        [organizationId],
      );

      await client.query(
        `
          DELETE FROM public.organizations
          WHERE id = $1
        `,
        [organizationId],
      );

      await client.query(
        `
          DELETE FROM public.users
          WHERE id = ANY($1::uuid[])
        `,
        [[administratorUserId, managerUserId, limitedUserId]],
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

  const invitationBody = (roleId: string) => ({
    organization_id: organizationId,
    email: inviteeEmail,
    role_id: roleId,
    expires_at: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });

  beforeAll(async () => {
    assertSafeEnvironment();

    const [
      { Test },
      { AppModule },
      { EmailService },
      { getDataSourceToken },
    ] = await Promise.all([
      import('@nestjs/testing'),
      import('../src/app.module.js'),
      import('../src/email/email.service.js'),
      import('@nestjs/typeorm'),
    ]);

    sendInvitationMock.mockResolvedValue(undefined);

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendInvitation: sendInvitationMock,
      })
      .compile();

    dataSource = moduleFixture.get<DataSource>(
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
        'RBAC E2E SAFETY CHECK FAILED: Unexpected app connection.',
      );
    }

    await setupFixture();

    const jwtService = moduleFixture.get(JwtService);

    administratorToken = jwtService.sign({
      sub: administratorUserId,
      email: administratorEmail,
    });

    managerToken = jwtService.sign({
      sub: managerUserId,
      email: managerEmail,
    });

    limitedToken = jwtService.sign({
      sub: limitedUserId,
      email: limitedEmail,
    });

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  it('returns 401 without JWT', async () => {
    await request(app!.getHttpServer())
      .post('/invitations')
      .send(invitationBody(limitedRoleId))
      .expect(401);
  });

  it('returns 403 without members.manage', async () => {
    await request(app!.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${limitedToken}`)
      .send(invitationBody(limitedRoleId))
      .expect(403);
  });

  it('returns 403 when assigning Administrator without roles.manage', async () => {
    await request(app!.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(invitationBody(administratorRoleId))
      .expect(403);
  });

  it('returns 201 with the required permissions', async () => {
    const response = await request(app!.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${administratorToken}`)
      .send(invitationBody(limitedRoleId))
      .expect(201);

    expect(response.body).toMatchObject({
      organization_id: organizationId,
      email: inviteeEmail,
      role_id: limitedRoleId,
    });

    expect(response.body).not.toHaveProperty('token');
    expect(sendInvitationMock).toHaveBeenCalledTimes(1);
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
