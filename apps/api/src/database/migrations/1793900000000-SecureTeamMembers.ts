
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureTeamMembers1793900000000
  implements MigrationInterface
{
  name = 'SecureTeamMembers1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure the required permission exists.
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
        'Security migration aborted: members.manage permission is missing.',
      );
    }

    // 2. Restrict direct table access.
    // Team membership updates must use the secured functions.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.team_members
      FROM promiseflow_app;

      GRANT SELECT, INSERT
      ON TABLE public.team_members
      TO promiseflow_app;
    `);

    // 3. Secure direct INSERT.
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

            AND EXISTS (
              SELECT 1
              FROM public.memberships m
              JOIN public.users u
                ON u.id = m.user_id
              WHERE m.organization_id = t.organization_id
                AND m.user_id = team_members.user_id
                AND m.deleted_at IS NULL
                AND u.deleted_at IS NULL
            )
        )
      );
    `);

    // 4. Remove the permissive direct UPDATE policy.
    // No UPDATE grant is provided to the application role.
    await queryRunner.query(`
      DROP POLICY IF EXISTS team_members_tenant_update
      ON public.team_members;
    `);

    // 5. Secure restoration of soft-deleted team members.
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

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          JOIN public.users u
            ON u.id = m.user_id
          WHERE m.organization_id = v_organization_id
            AND m.user_id = p_user_id
            AND m.deleted_at IS NULL
            AND u.deleted_at IS NULL
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

    // 6. Secure soft deletion.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.soft_delete_team_member(
        p_team_member_id uuid
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
        FROM public.team_members tm
        JOIN public.teams t
          ON t.id = tm.team_id
        JOIN public.organizations o
          ON o.id = t.organization_id
        WHERE tm.id = p_team_member_id
          AND tm.deleted_at IS NULL
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

        UPDATE public.team_members
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_team_member_id
          AND deleted_at IS NULL;

        RETURN FOUND;
      END;
      $function$;
    `);

    // 7. Restrict execution of both SECURITY DEFINER functions.
    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.restore_team_member(uuid, uuid)
      FROM PUBLIC;

      REVOKE ALL
      ON FUNCTION public.soft_delete_team_member(uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.restore_team_member(uuid, uuid)
      TO promiseflow_app;

      GRANT EXECUTE
      ON FUNCTION public.soft_delete_team_member(uuid)
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: reverting SecureTeamMembers ' +
        'would restore weaker authorization rules. ' +
        'Create a dedicated audited reversal migration if necessary.',
    );
  }
}
