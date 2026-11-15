
import { MigrationInterface, QueryRunner } from 'typeorm';

export class GrantAdministratorManagementPermissions1793200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF (
          SELECT COUNT(*)
          FROM public.permissions
          WHERE slug IN (
            'organizations.update',
            'members.manage',
            'roles.manage'
          )
            AND deleted_at IS NULL
        ) <> 3 THEN
          RAISE EXCEPTION
            'Required administrator permissions are missing';
        END IF;
      END;
      $$;
    `);

    await queryRunner.query(`
      INSERT INTO public.role_permissions (
        role_id,
        permission_id
      )
      SELECT r.id, p.id
      FROM public.roles r
      CROSS JOIN public.permissions p
      WHERE r.slug = 'administrator'
        AND r.deleted_at IS NULL
        AND p.slug IN (
          'members.manage',
          'roles.manage'
        )
        AND p.deleted_at IS NULL
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);

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

        SELECT COUNT(*)
        INTO v_permission_count
        FROM public.permissions
        WHERE slug IN (
          'organizations.update',
          'members.manage',
          'roles.manage'
        )
          AND deleted_at IS NULL;

        IF v_permission_count <> 3 THEN
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
          'roles.manage'
        )
          AND p.deleted_at IS NULL;

        RETURN v_organization_id;
      END;
      $function$;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: administrator management permissions ' +
        'may already be in use. Restore from a verified database backup ' +
        'or create a dedicated audited reversal migration.',
    );
  }
}
