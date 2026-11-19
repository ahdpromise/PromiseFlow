
import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceMaxMembersOnInvitationAcceptance1795200000000
  implements MigrationInterface
{
  name = 'EnforceMaxMembersOnInvitationAcceptance1795200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.accept_invitation_with_details(
        p_token text
      )
      RETURNS TABLE (
        membership_id uuid,
        organization_id uuid,
        invitation_id uuid,
        email text,
        role_id uuid
      )
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

        v_subscription_count integer;
        v_subscription_status text;
        v_period_start timestamptz;
        v_period_end timestamptz;
        v_plan_is_active boolean;
        v_feature_is_active boolean;
        v_feature_value_type text;
        v_limit_text text;
        v_member_limit integer;
        v_active_member_count bigint;
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
          RAISE EXCEPTION
            'Invitation email does not match current user';
        END IF;

        -- F-01: Reject deleted organizations.
        -- Serialize invitation acceptance per organization.
        -- NO KEY UPDATE remains compatible with FK KEY SHARE locks.
        PERFORM 1
        FROM public.organizations o
        WHERE o.id = v_organization_id
          AND o.deleted_at IS NULL
        FOR NO KEY UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION
            'Organization not found or inactive';
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
          RAISE EXCEPTION
            'User is already a member of this organization';
        END IF;

        -- Match the subscription eligibility rules used by
        -- ProjectsService.getProjectLimit().
        SELECT COUNT(*)::integer
        INTO v_subscription_count
        FROM public.subscriptions s
        WHERE s.organization_id = v_organization_id;

        IF v_subscription_count > 1 THEN
          RAISE EXCEPTION
            'Invalid subscription configuration';
        END IF;

        -- Preserve existing behavior when no subscription exists.
        IF v_subscription_count = 1 THEN
          SELECT
            s.status,
            s.current_period_start,
            s.current_period_end,
            p.is_active,
            f.is_active,
            f.value_type,
            pf.value
          INTO
            v_subscription_status,
            v_period_start,
            v_period_end,
            v_plan_is_active,
            v_feature_is_active,
            v_feature_value_type,
            v_limit_text
          FROM public.subscriptions s
          JOIN public.plans p
            ON p.id = s.plan_id
          LEFT JOIN public.features f
            ON f.slug = 'max_members'
          LEFT JOIN public.plan_features pf
            ON pf.plan_id = p.id
           AND pf.feature_id = f.id
          WHERE s.organization_id = v_organization_id;

          IF NOT FOUND THEN
            RAISE EXCEPTION
              'Invalid subscription configuration';
          END IF;

          IF (
            v_subscription_status NOT IN ('active', 'trialing')
            OR v_period_start IS NULL
            OR v_period_end IS NULL
            OR v_period_start > CURRENT_TIMESTAMP
            OR v_period_end <= CURRENT_TIMESTAMP
            OR v_plan_is_active IS DISTINCT FROM true
          ) THEN
            RAISE EXCEPTION
              'An active subscription is required to accept invitations';
          END IF;

          -- Missing or inactive features retain unlimited behavior.
          IF (
            v_feature_is_active IS TRUE
            AND v_limit_text IS NOT NULL
          ) THEN
            IF v_feature_value_type IS DISTINCT FROM 'number' THEN
              RAISE EXCEPTION
                'Invalid max_members feature configuration';
            END IF;

            IF (
              v_limit_text !~ '^[0-9]+$'
              OR length(v_limit_text) > 10
            ) THEN
              RAISE EXCEPTION
                'Invalid max_members limit configuration';
            END IF;

            BEGIN
              v_member_limit := v_limit_text::integer;
            EXCEPTION
              WHEN numeric_value_out_of_range THEN
                RAISE EXCEPTION
                  'Invalid max_members limit configuration';
            END;

            SELECT COUNT(*)
            INTO v_active_member_count
            FROM public.memberships m
            WHERE m.organization_id = v_organization_id
              AND m.deleted_at IS NULL;

            IF v_active_member_count >= v_member_limit THEN
              RAISE EXCEPTION
                'Organization member limit reached';
            END IF;
          END IF;
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

        UPDATE public.invitations i
        SET accepted_at = CURRENT_TIMESTAMP
        WHERE i.id = v_invitation_id;

        RETURN QUERY
        SELECT
          v_membership_id,
          v_organization_id,
          v_invitation_id,
          v_invitation_email::text,
          v_role_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.accept_invitation_with_details(text)
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.accept_invitation_with_details(text)
      TO promiseflow_app;
    `);
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Automatic rollback prevented: invitation acceptance security changes require a reviewed reversal migration.',
    );
  }
}
