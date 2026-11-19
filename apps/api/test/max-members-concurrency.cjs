
'use strict';

require('dotenv').config();

const { Client } = require('pg');
const { randomUUID } = require('node:crypto');

const TEST_DB = 'promiseflow_rls_test';
const ADMIN_ROLE = 'postgres';
const APP_ROLE = 'promiseflow_app';

const config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 5432),
  database: TEST_DB,
  user: ADMIN_ROLE,
  password: process.env.DATABASE_PASSWORD,
  ssl: false,
  connectionTimeoutMillis: 5000,
  query_timeout: 20000,
};

async function connect() {
  const db = new Client(config);
  await db.connect();

  const result = await db.query(`
    SELECT current_database() AS database_name,
           session_user AS session_user
  `);

  if (
    result.rows[0].database_name !== TEST_DB ||
    result.rows[0].session_user !== ADMIN_ROLE
  ) {
    await db.end();
    throw new Error('Unsafe database connection');
  }

  return db;
}

async function main() {
  if (
    process.env.DATABASE_NAME !== TEST_DB ||
    process.env.DATABASE_USER !== ADMIN_ROLE
  ) {
    throw new Error(
      'Refusing to run: test database and postgres role required',
    );
  }

  const prefix = `pf-concurrency-${randomUUID()}`;
  let admin;
  let first;
  let second;
  let organizationId;
  let roleId;
  let setupCommitted = false;
  let cleanupSucceeded = false;

  const createdUserIds = [];
  const invitations = [];

  async function cleanup() {
    if (!admin || !setupCommitted || !organizationId) {
      return;
    }

    await admin.query('BEGIN');

    try {
      await admin.query(
        `DELETE FROM public.memberships
         WHERE organization_id = $1`,
        [organizationId],
      );

      await admin.query(
        `DELETE FROM public.invitations
         WHERE organization_id = $1`,
        [organizationId],
      );

      await admin.query(
        `DELETE FROM public.subscriptions
         WHERE organization_id = $1`,
        [organizationId],
      );

      await admin.query(
        `DELETE FROM public.roles
         WHERE organization_id = $1`,
        [organizationId],
      );

      for (const userId of createdUserIds) {
        await admin.query(
          `DELETE FROM public.users WHERE id = $1`,
          [userId],
        );
      }

      await admin.query(
        `DELETE FROM public.organizations
         WHERE id = $1`,
        [organizationId],
      );

      await admin.query('COMMIT');
      cleanupSucceeded = true;
    } catch (error) {
      await admin.query('ROLLBACK');
      throw error;
    }
  }

  try {
    admin = await connect();

    await admin.query('BEGIN');

    const plan = await admin.query(`
      SELECT id
      FROM public.plans
      WHERE name = 'Pro'
        AND is_active = true
    `);

    if (plan.rowCount !== 1) {
      throw new Error('Expected exactly one active Pro plan');
    }

    const org = await admin.query(
      `INSERT INTO public.organizations (name, slug)
       VALUES ($1, $2)
       RETURNING id`,
      ['Concurrency Test', prefix],
    );

    organizationId = org.rows[0].id;

    const role = await admin.query(
      `INSERT INTO public.roles (
         organization_id, name, slug
       )
       VALUES ($1, 'Administrator', 'administrator')
       RETURNING id`,
      [organizationId],
    );

    roleId = role.rows[0].id;

    await admin.query(
      `INSERT INTO public.subscriptions (
         organization_id,
         plan_id,
         status,
         current_period_start,
         current_period_end
       )
       VALUES (
         $1, $2, 'active',
         CURRENT_TIMESTAMP - INTERVAL '1 day',
         CURRENT_TIMESTAMP + INTERVAL '30 days'
       )`,
      [organizationId, plan.rows[0].id],
    );

    // Create nine active memberships.
    for (let i = 1; i <= 9; i++) {
      const email = `${prefix}-existing-${i}@example.test`;

      const user = await admin.query(
        `INSERT INTO public.users (
           first_name,
           last_name,
           email,
           password_hash
         )
         VALUES ('Test', 'Member', $1, $2)
         RETURNING id`,
        [email, 'test-only-invalid-password-hash'],
      );

      const userId = user.rows[0].id;
      createdUserIds.push(userId);

      await admin.query(
        `INSERT INTO public.memberships (
           user_id, organization_id, role_id
         )
         VALUES ($1, $2, $3)`,
        [userId, organizationId, roleId],
      );
    }

    // Prepare two valid invitations.
    for (let i = 1; i <= 2; i++) {
      const email = `${prefix}-invited-${i}@example.test`;
      const token = `${prefix}-token-${i}`;

      const user = await admin.query(
        `INSERT INTO public.users (
           first_name,
           last_name,
           email,
           password_hash
         )
         VALUES ('Test', 'Invited', $1, $2)
         RETURNING id`,
        [email, 'test-only-invalid-password-hash'],
      );

      const userId = user.rows[0].id;
      createdUserIds.push(userId);

      await admin.query(
        `INSERT INTO public.invitations (
           organization_id,
           email,
           role_id,
           token,
           expires_at
         )
         VALUES (
           $1, $2, $3, $4,
           CURRENT_TIMESTAMP + INTERVAL '7 days'
         )`,
        [organizationId, email, roleId, token],
      );

      invitations.push({ userId, token });
    }

    await admin.query('COMMIT');
    setupCommitted = true;

    first = await connect();
    second = await connect();

    async function acceptInvitation(db, invitation) {
      await db.query('BEGIN');

      try {
        await db.query(`SET LOCAL ROLE ${APP_ROLE}`);

        await db.query(
          `SELECT set_config('app.user_id', $1, true)`,
          [invitation.userId],
        );

        await db.query(
          `SELECT *
           FROM public.accept_invitation_with_details($1)`,
          [invitation.token],
        );

        await db.query('COMMIT');

        return { accepted: true };
      } catch (error) {
        await db.query('ROLLBACK');

        if (
          error.message ===
          'Organization member limit reached'
        ) {
          return {
            accepted: false,
            reason: 'member_limit',
          };
        }

        throw error;
      }
    }

    // Two independent connections execute concurrently.
    const results = await Promise.all([
      acceptInvitation(first, invitations[0]),
      acceptInvitation(second, invitations[1]),
    ]);

    const accepted = results.filter(
      (result) => result.accepted,
    ).length;

    const rejected = results.filter(
      (result) => result.reason === 'member_limit',
    ).length;

    const members = await admin.query(
      `SELECT COUNT(*)::integer AS count
       FROM public.memberships
       WHERE organization_id = $1
         AND deleted_at IS NULL`,
      [organizationId],
    );

    const acceptedInvitations = await admin.query(
      `SELECT COUNT(*)::integer AS count
       FROM public.invitations
       WHERE organization_id = $1
         AND accepted_at IS NOT NULL`,
      [organizationId],
    );

    if (accepted !== 1) {
      throw new Error(
        `Expected one accepted invitation, got ${accepted}`,
      );
    }

    if (rejected !== 1) {
      throw new Error(
        `Expected one limit rejection, got ${rejected}`,
      );
    }

    if (members.rows[0].count !== 10) {
      throw new Error(
        `Expected 10 active members, got ${members.rows[0].count}`,
      );
    }

    if (acceptedInvitations.rows[0].count !== 1) {
      throw new Error(
        'Expected exactly one accepted invitation',
      );
    }

    console.log('PASS: One concurrent invitation accepted');
    console.log('PASS: One concurrent invitation rejected');
    console.log('PASS: Active memberships remain at 10');
    console.log('PASS: Exactly one invitation marked accepted');
  } finally {
    if (first) await first.end();
    if (second) await second.end();

    if (admin) {
      try {
        await admin.query('ROLLBACK');
        await cleanup();

        if (setupCommitted && !cleanupSucceeded) {
          throw new Error('Cleanup was not confirmed');
        }

        if (cleanupSucceeded) {
          console.log('PASS: Test data cleaned up');
        }
      } finally {
        await admin.end();
      }
    }
  }

  console.log('MAX_MEMBERS_CONCURRENCY_TEST_PASSED');
}

main().catch((error) => {
  console.error('TEST FAILED:', error.message);
  console.error(
    'If cleanup failed, inspect only records with prefix pf-concurrency-',
  );
  process.exitCode = 1;
});
