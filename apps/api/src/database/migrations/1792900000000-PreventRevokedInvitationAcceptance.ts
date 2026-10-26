import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreventRevokedInvitationAcceptance1792900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.accept_invitation(
        p_token text
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
      DECLARE
          v_user_id uuid;
          v_user_email text;
          v_invitation_id uuid;
          v_organization_id uuid;
          v_role_id uuid;
          v_invitation_email public.citext;
          v_expires_at timestamptz;
          v_accepted_at timestamptz;
          v_revoked_at timestamptz;
          v_membership_id uuid;
      BEGIN
          v_user_id := NULLIF(
              current_setting('app.user_id', true),
              ''
          )::uuid;

          IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'app.user_id is not set';
          END IF;

          SELECT u.email
          INTO v_user_email
          FROM public.users u
          WHERE u.id = v_user_id
            AND u.deleted_at IS NULL;

          IF v_user_email IS NULL THEN
              RAISE EXCEPTION 'Current user not found';
          END IF;

          SELECT
              i.id,
              i.organization_id,
              i.role_id,
              i.email,
              i.expires_at,
              i.accepted_at,
              i.revoked_at
          INTO
              v_invitation_id,
              v_organization_id,
              v_role_id,
              v_invitation_email,
              v_expires_at,
              v_accepted_at,
              v_revoked_at
          FROM public.invitations i
          WHERE i.token = p_token
            AND i.deleted_at IS NULL
          FOR UPDATE;

          IF v_invitation_id IS NULL THEN
              RAISE EXCEPTION 'Invitation not found';
          END IF;

          IF v_accepted_at IS NOT NULL THEN
              RAISE EXCEPTION 'Invitation has already been accepted';
          END IF;

          IF v_revoked_at IS NOT NULL THEN
              RAISE EXCEPTION 'Invitation has been revoked';
          END IF;

          IF v_expires_at <= CURRENT_TIMESTAMP THEN
              RAISE EXCEPTION 'Invitation has expired';
          END IF;

          IF v_invitation_email <> v_user_email::public.citext THEN
              RAISE EXCEPTION 'Invitation email does not match current user';
          END IF;

          IF NOT EXISTS (
              SELECT 1
              FROM public.roles r
              WHERE r.id = v_role_id
                AND r.organization_id = v_organization_id
                AND r.deleted_at IS NULL
          ) THEN
              RAISE EXCEPTION 'Invitation role is invalid';
          END IF;

          IF EXISTS (
              SELECT 1
              FROM public.memberships m
              WHERE m.user_id = v_user_id
                AND m.organization_id = v_organization_id
                AND m.deleted_at IS NULL
          ) THEN
              RAISE EXCEPTION 'User is already a member of this organization';
          END IF;

          INSERT INTO public.memberships (
              user_id,
              organization_id,
              role_id
          )
          VALUES (
              v_user_id,
              v_organization_id,
              v_role_id
          )
          RETURNING id INTO v_membership_id;

          UPDATE public.invitations
          SET accepted_at = CURRENT_TIMESTAMP
          WHERE id = v_invitation_id;

          RETURN v_membership_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.accept_invitation(text)
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.accept_invitation(text)
      TO promiseflow_app;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.accept_invitation(
        p_token text
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
      DECLARE
          v_user_id uuid;
          v_user_email text;
          v_invitation_id uuid;
          v_organization_id uuid;
          v_role_id uuid;
          v_invitation_email public.citext;
          v_expires_at timestamptz;
          v_accepted_at timestamptz;
          v_membership_id uuid;
      BEGIN
          v_user_id := NULLIF(
              current_setting('app.user_id', true),
              ''
          )::uuid;

          IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'app.user_id is not set';
          END IF;

          SELECT u.email
          INTO v_user_email
          FROM public.users u
          WHERE u.id = v_user_id
            AND u.deleted_at IS NULL;

          IF v_user_email IS NULL THEN
              RAISE EXCEPTION 'Current user not found';
          END IF;

          SELECT
              i.id,
              i.organization_id,
              i.role_id,
              i.email,
              i.expires_at,
              i.accepted_at
          INTO
              v_invitation_id,
              v_organization_id,
              v_role_id,
              v_invitation_email,
              v_expires_at,
              v_accepted_at
          FROM public.invitations i
          WHERE i.token = p_token
            AND i.deleted_at IS NULL
          FOR UPDATE;

          IF v_invitation_id IS NULL THEN
              RAISE EXCEPTION 'Invitation not found';
          END IF;

          IF v_accepted_at IS NOT NULL THEN
              RAISE EXCEPTION 'Invitation has already been accepted';
          END IF;

          IF v_expires_at <= CURRENT_TIMESTAMP THEN
              RAISE EXCEPTION 'Invitation has expired';
          END IF;

          IF v_invitation_email <> v_user_email::public.citext THEN
              RAISE EXCEPTION 'Invitation email does not match current user';
          END IF;

          IF NOT EXISTS (
              SELECT 1
              FROM public.roles r
              WHERE r.id = v_role_id
                AND r.organization_id = v_organization_id
                AND r.deleted_at IS NULL
          ) THEN
              RAISE EXCEPTION 'Invitation role is invalid';
          END IF;

          IF EXISTS (
              SELECT 1
              FROM public.memberships m
              WHERE m.user_id = v_user_id
                AND m.organization_id = v_organization_id
                AND m.deleted_at IS NULL
          ) THEN
              RAISE EXCEPTION 'User is already a member of this organization';
          END IF;

          INSERT INTO public.memberships (
              user_id,
              organization_id,
              role_id
          )
          VALUES (
              v_user_id,
              v_organization_id,
              v_role_id
          )
          RETURNING id INTO v_membership_id;

          UPDATE public.invitations
          SET accepted_at = CURRENT_TIMESTAMP
          WHERE id = v_invitation_id;

          RETURN v_membership_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.accept_invitation(text)
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.accept_invitation(text)
      TO promiseflow_app;
    `);
  }
}