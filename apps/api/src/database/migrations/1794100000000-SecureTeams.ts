
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureTeams1794100000000
  implements MigrationInterface
{
  name = 'SecureTeams1794100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Verify required permissions.
    const permissions: Array<{ slug: string }> =
      await queryRunner.query(`
        SELECT slug
        FROM public.permissions
        WHERE slug IN (
          'teams.create',
          'teams.update',
          'teams.delete'
        )
        AND deleted_at IS NULL;
      `);

    const availablePermissions = new Set(
      permissions.map((permission) => permission.slug),
    );

    for (const permission of [
      'teams.create',
      'teams.update',
      'teams.delete',
    ]) {
      if (!availablePermissions.has(permission)) {
        throw new Error(
          'Security migration aborted: missing permission ' +
            permission,
        );
      }
    }

    // 2. Restrict direct table privileges.
    // Only approved business columns may be updated.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.teams
      FROM promiseflow_app;

      GRANT SELECT, INSERT
      ON TABLE public.teams
      TO promiseflow_app;

      GRANT UPDATE (
        name,
        slug,
        description,
        updated_at
      )
      ON TABLE public.teams
      TO promiseflow_app;
    `);

    // 3. Secure INSERT with teams.create permission.
    await queryRunner.query(`
      DROP POLICY IF EXISTS teams_tenant_insert
      ON public.teams;

      CREATE POLICY teams_tenant_insert
      ON public.teams
      FOR INSERT
      TO promiseflow_app
      WITH CHECK (
        deleted_at IS NULL

        AND public.current_user_has_organization_permission(
          organization_id,
          'teams.create'
        )

        AND EXISTS (
          SELECT 1
          FROM public.organizations o
          WHERE o.id = teams.organization_id
            AND o.deleted_at IS NULL
        )
      );
    `);

    // 4. Secure UPDATE with teams.update permission.
    await queryRunner.query(`
      DROP POLICY IF EXISTS teams_tenant_update
      ON public.teams;

      CREATE POLICY teams_tenant_update
      ON public.teams
      FOR UPDATE
      TO promiseflow_app
      USING (
        deleted_at IS NULL

        AND public.current_user_has_organization_permission(
          organization_id,
          'teams.update'
        )
      )
      WITH CHECK (
        deleted_at IS NULL

        AND public.current_user_has_organization_permission(
          organization_id,
          'teams.update'
        )

        AND EXISTS (
          SELECT 1
          FROM public.organizations o
          WHERE o.id = teams.organization_id
            AND o.deleted_at IS NULL
        )
      );
    `);

    // 5. Secure soft deletion.
    // Only users with teams.delete may delete teams.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.soft_delete_team(
        p_team_id uuid
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
          'teams.delete'
        ) THEN
          RETURN false;
        END IF;

        UPDATE public.teams
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_team_id
          AND deleted_at IS NULL;

        RETURN FOUND;
      END;
      $function$;
    `);

    // 6. Restrict SECURITY DEFINER function execution.
    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.soft_delete_team(uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.soft_delete_team(uuid)
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: reverting SecureTeams ' +
        'would restore weaker authorization rules. ' +
        'Create a dedicated audited reversal migration if necessary.',
    );
  }
}
