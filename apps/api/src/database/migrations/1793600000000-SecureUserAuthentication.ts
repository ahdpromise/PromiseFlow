
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureUserAuthentication1793600000000
  implements MigrationInterface
{
  name = 'SecureUserAuthentication1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.bootstrap_organization(
        p_name text,
        p_slug text
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
      DECLARE
        v_user_id uuid;
        v_organization_id uuid;
        v_role_id uuid;
        v_permission_count integer;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = v_user_id
            AND u.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION 'Current user not found or inactive';
        END IF;

        SELECT COUNT(*)
        INTO v_permission_count
        FROM public.permissions
        WHERE slug IN (
          'organizations.update',
          'members.manage',
          'roles.manage',
          'audit_logs.read'
        )
          AND deleted_at IS NULL;

        IF v_permission_count <> 4 THEN
          RAISE EXCEPTION
            'Required administrator permissions are missing';
        END IF;

        INSERT INTO public.organizations (name, slug)
        VALUES (p_name, p_slug)
        RETURNING id INTO v_organization_id;

        INSERT INTO public.roles (
          organization_id,
          name,
          slug,
          description
        )
        VALUES (
          v_organization_id,
          'Administrator',
          'administrator',
          'Default administrator role'
        )
        RETURNING id INTO v_role_id;

        INSERT INTO public.memberships (
          user_id,
          organization_id,
          role_id
        )
        VALUES (
          v_user_id,
          v_organization_id,
          v_role_id
        );

        INSERT INTO public.role_permissions (
          role_id,
          permission_id
        )
        SELECT
          v_role_id,
          p.id
        FROM public.permissions p
        WHERE p.slug IN (
          'organizations.update',
          'members.manage',
          'roles.manage',
          'audit_logs.read'
        )
          AND p.deleted_at IS NULL;

        RETURN v_organization_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.bootstrap_organization(text, text)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.bootstrap_organization(text, text)
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      CREATE FUNCTION public.is_user_active(
        p_user_id uuid
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
        SELECT
          p_user_id IS NOT NULL
          AND p_user_id = NULLIF(
            current_setting('app.user_id', true),
            ''
          )::uuid
          AND EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = p_user_id
              AND u.deleted_at IS NULL
          );
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.is_user_active(uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.is_user_active(uuid)
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: security functions may ' +
        'already be in use. Create a dedicated audited ' +
        'reversal migration if necessary.',
    );
  }
}
