
import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixTeamMemberEligibilityCheck1794000000000
  implements MigrationInterface
{
  name = 'FixTeamMemberEligibilityCheck1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fail closed if the required permission is missing.
    const permissions: Array<{ id: string }> =
      await queryRunner.query(`
        SELECT id
        FROM public.permissions
        WHERE slug = 'members.manage'
          AND deleted_at IS NULL
        LIMIT 1;
      `);

    if (permissions.length !== 1) {
      throw new Error(
        'Security migration aborted: members.manage is missing.',
      );
    }

    // Check target eligibility without exposing users to RLS callers.
    await queryRunner.query(`
      CREATE FUNCTION public.is_eligible_team_member(
        p_organization_id uuid,
        p_user_id uuid
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = pg_catalog
      AS $function$
        SELECT EXISTS (
          SELECT 1
          FROM public.organizations o
          JOIN public.memberships m
            ON m.organization_id = o.id
          JOIN public.users u
            ON u.id = m.user_id
          WHERE o.id = p_organization_id
            AND o.deleted_at IS NULL
            AND m.user_id = p_user_id
            AND m.deleted_at IS NULL
            AND u.deleted_at IS NULL
        );
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.is_eligible_team_member(uuid, uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.is_eligible_team_member(uuid, uuid)
      TO promiseflow_app;
    `);

    // Replace INSERT policy without weakening members.manage.
    await queryRunner.query(`
      DROP POLICY IF EXISTS team_members_tenant_insert
      ON public.team_members;

      CREATE POLICY team_members_tenant_insert
      ON public.team_members
      FOR INSERT
      TO promiseflow_app
      WITH CHECK (
        deleted_at IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.teams t
          JOIN public.organizations o
            ON o.id = t.organization_id
          WHERE t.id = team_members.team_id
            AND t.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND public.current_user_has_organization_permission(
              t.organization_id,
              'members.manage'
            )
            AND public.is_eligible_team_member(
              t.organization_id,
              team_members.user_id
            )
        )
      );
    `);

    // Restore only if the actor is authorized and target eligible.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.restore_team_member(
        p_team_id uuid,
        p_user_id uuid
      )
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog
      AS $function$
      DECLARE
        v_organization_id uuid;
      BEGIN
        SELECT t.organization_id
        INTO v_organization_id
        FROM public.teams t
        JOIN public.organizations o
          ON o.id = t.organization_id
        WHERE t.id = p_team_id
          AND t.deleted_at IS NULL
          AND o.deleted_at IS NULL;

        IF v_organization_id IS NULL THEN
          RETURN false;
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          'members.manage'
        ) THEN
          RETURN false;
        END IF;

        IF NOT public.is_eligible_team_member(
          v_organization_id,
          p_user_id
        ) THEN
          RETURN false;
        END IF;

        UPDATE public.team_members
        SET deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE team_id = p_team_id
          AND user_id = p_user_id
          AND deleted_at IS NOT NULL;

        RETURN FOUND;
      END;
      $function$;
    `);

    // Reassert execution restrictions.
    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.restore_team_member(uuid, uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.restore_team_member(uuid, uuid)
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: reversing this migration ' +
        'would restore a broken or weaker security policy.',
    );
  }
}
