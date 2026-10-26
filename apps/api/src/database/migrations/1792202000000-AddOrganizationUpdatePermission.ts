
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationUpdatePermission1792202000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO public.permissions (name, slug, description)
      VALUES (
        'Update Organization',
        'organizations.update',
        'Update organization workspace settings'
      )
      ON CONFLICT (slug) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM public.roles r
      CROSS JOIN public.permissions p
      WHERE r.slug = 'administrator'
        AND r.deleted_at IS NULL
        AND p.slug = 'organizations.update'
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
        v_permission_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
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

        SELECT id INTO v_permission_id
        FROM public.permissions
        WHERE slug = 'organizations.update'
          AND deleted_at IS NULL;

        IF v_permission_id IS NULL THEN
          RAISE EXCEPTION 'organizations.update permission is missing';
        END IF;

        INSERT INTO public.role_permissions (
          role_id,
          permission_id
        )
        VALUES (v_role_id, v_permission_id);

        RETURN v_organization_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      CREATE FUNCTION public.update_organization_settings(
        p_organization_id uuid,
        p_name text,
        p_slug text
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
      DECLARE
        v_user_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'Authentication required';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          JOIN public.roles r
            ON r.id = m.role_id
           AND r.organization_id = m.organization_id
          JOIN public.role_permissions rp
            ON rp.role_id = r.id
          JOIN public.permissions p
            ON p.id = rp.permission_id
          WHERE m.user_id = v_user_id
            AND m.organization_id = p_organization_id
            AND m.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND p.slug = 'organizations.update'
        ) THEN
          RAISE EXCEPTION 'Permission denied';
        END IF;

        IF p_name IS NULL
           OR length(btrim(p_name)) = 0
           OR length(btrim(p_name)) > 150 THEN
          RAISE EXCEPTION 'Invalid organization name';
        END IF;

        IF p_slug IS NULL
           OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
           OR length(p_slug) > 100 THEN
          RAISE EXCEPTION 'Invalid organization slug';
        END IF;

        UPDATE public.organizations
        SET
          name = btrim(p_name),
          slug = p_slug,
          updated_at = now()
        WHERE id = p_organization_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Organization not found';
        END IF;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.update_organization_settings(uuid, text, text)
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.update_organization_settings(uuid, text, text)
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      REVOKE UPDATE
      ON TABLE public.organizations
      FROM promiseflow_app;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS
      public.update_organization_settings(uuid, text, text);
    `);

    await queryRunner.query(`
      GRANT UPDATE
      ON TABLE public.organizations
      TO promiseflow_app;
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
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
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

        RETURN v_organization_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      DELETE FROM public.role_permissions
      WHERE permission_id IN (
        SELECT id
        FROM public.permissions
        WHERE slug = 'organizations.update'
      );
    `);

    await queryRunner.query(`
      DELETE FROM public.permissions
      WHERE slug = 'organizations.update';
    `);
  }
}
