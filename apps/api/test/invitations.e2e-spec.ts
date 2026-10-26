
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import type { DataSource } from 'typeorm';
import type { App } from 'supertest/types';

import request from 'supertest';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const USER_C = '33333333-3333-4333-8333-333333333333';

const ORGANIZATION_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROLE_A = 'aaaaaaaa-1111-4111-8111-111111111111';

const INVITEE_EMAIL = 'invitee@e2e.invalid';
const TEST_EMAIL = 'invited-user@e2e.invalid';

type InvitationBody = {
  id: string;
  organization_id: string;
  email: string;
  revoked_at: string | null;
  accepted_at: string | null;
};

describe('Invitations API (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let dataSource: DataSource;

  let tokenA: string;
  let tokenB: string;
  let tokenC: string;

  const createdInvitationIds: string[] = [];
  const createdMembershipIds: string[] = [];

  const sendInvitationMock = jest.fn<
    (email: string, token: string) => Promise<void>
  >();

  const createInvitation = async (email: string) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const response = await request(app.getHttpServer())
      .post('/invitations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        organization_id: ORGANIZATION_A,
        email,
        role_id: ROLE_A,
        expires_at: expiresAt.toISOString(),
      })
      .expect(201);

    const invitation = response.body as InvitationBody;

    createdInvitationIds.push(invitation.id);

    expect(invitation.organization_id).toBe(ORGANIZATION_A);
    expect(invitation.email).toBe(email);
    expect(invitation).not.toHaveProperty('token');

    return invitation;
  };

  const latestEmailToken = (): string => {
    const calls = sendInvitationMock.mock.calls;
    const latestCall = calls[calls.length - 1];

    if (!latestCall) {
      throw new Error('Expected invitation email was not sent.');
    }

    return latestCall[1];
  };

  beforeAll(async () => {
    if (
      process.env.DATABASE_NAME !== 'promiseflow_test' ||
      process.env.DATABASE_USER !== 'promiseflow_app'
    ) {
      throw new Error(
        'E2E SAFETY CHECK FAILED: Invalid application database.',
      );
    }

    if (!process.env.TEST_DB_ADMIN_PASSWORD) {
      throw new Error(
        'TEST_DB_ADMIN_PASSWORD is required for safe cleanup.',
      );
    }

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

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendInvitation: sendInvitationMock,
      })
      .compile();

    dataSource =
      moduleFixture.get<DataSource>(getDataSourceToken());

    const result: Array<{
      database_name: string;
      database_user: string;
    }> = await dataSource.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user
    `);

    if (
      result.length !== 1 ||
      result[0].database_name !== 'promiseflow_test' ||
      result[0].database_user !== 'promiseflow_app'
    ) {
      throw new Error(
        'E2E SAFETY CHECK FAILED: Unexpected database connection.',
      );
    }

    const jwtService = moduleFixture.get(JwtService);

    tokenA = jwtService.sign({
      sub: USER_A,
      email: 'owner-a@e2e.invalid',
    });

    tokenB = jwtService.sign({
      sub: USER_B,
      email: 'owner-b@e2e.invalid',
    });

    tokenC = jwtService.sign({
      sub: USER_C,
      email: INVITEE_EMAIL,
    });

    sendInvitationMock.mockResolvedValue(undefined);

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  describe('JWT authentication', () => {
    it('GET rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/invitations')
        .expect(401);
    });

    it('POST rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/invitations')
        .send({})
        .expect(401);
    });

    it('Accept rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch('/invitations/accept')
        .send({ token: 'invalid-token' })
        .expect(401);
    });

    it('Revoke rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch(
          '/invitations/00000000-0000-4000-8000-000000000001/revoke',
        )
        .expect(401);
    });

    it('Resend rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .patch(
          '/invitations/00000000-0000-4000-8000-000000000001/resend',
        )
        .expect(401);
    });
  });

  describe('Create Invitation', () => {
    it('creates an invitation for organization A', async () => {
      await createInvitation(TEST_EMAIL);
    });

    it('does not expose invitation tokens in GET', async () => {
      const response = await request(app.getHttpServer())
        .get('/invitations')
        .set('Authorization', `Bearer ${tokenA}`)
        .query({ organization_id: ORGANIZATION_A })
        .expect(200);

      const invitation = (
        response.body as Array<Record<string, unknown>>
      ).find((item) =>
        createdInvitationIds.includes(item.id as string),
      );

      expect(invitation).toBeDefined();
      expect(invitation).not.toHaveProperty('token');
      expect(sendInvitationMock).toHaveBeenCalledTimes(1);
    });

    it('isolates invitations between organizations', async () => {
      const response = await request(app.getHttpServer())
        .get('/invitations')
        .set('Authorization', `Bearer ${tokenB}`)
        .query({ organization_id: ORGANIZATION_A })
        .expect(200);

      expect(
        (response.body as Array<{ id: string }>).some(
          (invitation) =>
            createdInvitationIds.includes(invitation.id),
        ),
      ).toBe(false);
    });
  });

  describe('Accept Invitation', () => {
    it('accepts a valid invitation and creates membership', async () => {
      await createInvitation(INVITEE_EMAIL);
      const invitationToken = latestEmailToken();

      const response = await request(app.getHttpServer())
        .patch('/invitations/accept')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ token: invitationToken })
        .expect(200);

      const membershipId = response.body.membership_id as string;

      expect(membershipId).toBeDefined();
      expect(response.body.organization_id).toBe(ORGANIZATION_A);

      createdMembershipIds.push(membershipId);

      const rows: Array<{
        user_id: string;
        organization_id: string;
      }> = await dataSource.query(
        `
          SELECT user_id, organization_id
          FROM public.memberships
          WHERE id = $1
        `,
        [membershipId],
      );

      if (rows.length > 0) {
        expect(rows[0].user_id).toBe(USER_C);
        expect(rows[0].organization_id).toBe(ORGANIZATION_A);
      }
    });

    it('rejects accepting the same invitation twice with 409', async () => {
      const invitationToken = latestEmailToken();

      const response = await request(app.getHttpServer())
        .patch('/invitations/accept')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ token: invitationToken })
        .expect(409);

      expect(response.body.message).toBe(
        'Invitation has already been accepted',
      );
    });

    it('rejects mismatched email with 400', async () => {
      await createInvitation(TEST_EMAIL);
      const invitationToken = latestEmailToken();

      const response = await request(app.getHttpServer())
        .patch('/invitations/accept')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ token: invitationToken })
        .expect(400);

      expect(response.body.message).toBe(
        'Invitation email does not match current user',
      );
    });

    it('rejects a revoked invitation with 400', async () => {
      const invitation = await createInvitation(INVITEE_EMAIL);
      const invitationToken = latestEmailToken();

      await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/revoke`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .patch('/invitations/accept')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ token: invitationToken })
        .expect(400);

      expect(response.body.message).toBe(
        'Invitation has been revoked',
      );
    });

    it('rejects an unknown invitation token with 404', async () => {
      await request(app.getHttpServer())
        .patch('/invitations/accept')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ token: 'e2e-nonexistent-invitation-token' })
        .expect(404);
    });
  });

  describe('Revoke Invitation', () => {
    it('revokes an active invitation', async () => {
      const invitation = await createInvitation(TEST_EMAIL);

      const response = await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/revoke`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.revoked_at).not.toBeNull();
      expect(response.body).not.toHaveProperty('token');
    });

    it('rejects revoking an already revoked invitation', async () => {
      const invitation = await createInvitation(TEST_EMAIL);

      await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/revoke`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/revoke`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);
    });

    it('prevents another tenant from revoking invitation', async () => {
      const invitation = await createInvitation(TEST_EMAIL);

      await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/revoke`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('Resend Invitation', () => {
    it('generates a new token and hides it from response', async () => {
      const invitation = await createInvitation(TEST_EMAIL);
      const previousToken = latestEmailToken();

      const response = await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/resend`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const newToken = latestEmailToken();

      expect(newToken).not.toBe(previousToken);
      expect(response.body).not.toHaveProperty('token');
    });

    it('rejects resending a revoked invitation', async () => {
      const invitation = await createInvitation(TEST_EMAIL);

      await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/revoke`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      const emailCountBefore = sendInvitationMock.mock.calls.length;

      const response = await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/resend`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400);

      expect(response.body.message).toBe(
        'Revoked invitations cannot be resent',
      );

      expect(sendInvitationMock.mock.calls.length).toBe(
        emailCountBefore,
      );
    });

    it('prevents another tenant from resending invitation', async () => {
      const invitation = await createInvitation(TEST_EMAIL);

      await request(app.getHttpServer())
        .patch(`/invitations/${invitation.id}/resend`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  afterAll(async () => {
    try {
      if (
        createdInvitationIds.length > 0 ||
        createdMembershipIds.length > 0
      ) {
        const pgModule = await import('pg');
        const PgClient = pgModule.Client;

        const client = new PgClient({
          host: process.env.DATABASE_HOST,
          port: Number(process.env.DATABASE_PORT || 5432),
          database: 'promiseflow_test',
          user: 'postgres',
          password: process.env.TEST_DB_ADMIN_PASSWORD,
        });

        await client.connect();

        try {
          await client.query('BEGIN');

          const verification = await client.query<{
            database_name: string;
            database_user: string;
          }>(`
            SELECT
              current_database() AS database_name,
              current_user AS database_user
          `);

          if (
            verification.rows.length !== 1 ||
            verification.rows[0].database_name !==
              'promiseflow_test' ||
            verification.rows[0].database_user !== 'postgres'
          ) {
            throw new Error(
              'E2E CLEANUP SAFETY CHECK FAILED.',
            );
          }

          await client.query(
            `
              DELETE FROM public.audit_logs
              WHERE entity_type = 'invitation'
                AND entity_id = ANY($1::uuid[])
                AND organization_id = $2
            `,
            [createdInvitationIds, ORGANIZATION_A],
          );

          await client.query(
            `
              DELETE FROM public.activities
              WHERE entity_type = 'invitation'
                AND entity_id = ANY($1::uuid[])
                AND organization_id = $2
            `,
            [createdInvitationIds, ORGANIZATION_A],
          );

          await client.query(
            `
              DELETE FROM public.memberships
              WHERE id = ANY($1::uuid[])
                AND user_id = $2
                AND organization_id = $3
            `,
            [createdMembershipIds, USER_C, ORGANIZATION_A],
          );

          await client.query(
            `
              DELETE FROM public.invitations
              WHERE id = ANY($1::uuid[])
                AND organization_id = $2
                AND email IN ($3, $4)
            `,
            [
              createdInvitationIds,
              ORGANIZATION_A,
              TEST_EMAIL,
              INVITEE_EMAIL,
            ],
          );

          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          await client.end();
        }
      }
    } finally {
      if (app) {
        await app.close();
      } else if (moduleFixture) {
        await moduleFixture.close();
      }
    }
  }, 15000);
});
