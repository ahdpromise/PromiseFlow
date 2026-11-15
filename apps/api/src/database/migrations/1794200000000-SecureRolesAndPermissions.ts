
import { MigrationInterface, QueryRunner } from 'typeorm';

const ADMIN_PERMISSION_SLUGS = [
  'audit_logs.read',
  'members.manage',
  'members.read',
  'organizations.update',
  'projects.create',
  'projects.delete',
  'projects.read',
  'projects.update',
  'roles.manage',
  'roles.read',
  'tasks.create',
  'tasks.delete',
  'tasks.read',
  'tasks.update',
  'teams.create',
  'teams.delete',
  'teams.read',
  'teams.update',
  'workflows.create',
  'workflows.delete',
  'workflows.read',
  'workflows.update',
] as const;

export class SecureRolesAndPermissions1794200000000
  implements MigrationInterface
{
  name = 'SecureRolesAndPermissions1794200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verify the expected permission catalog before changing anything.
    const permissions: Array<{ slug: string }> =
      await queryRunner.query(
        `
          SELECT slug
          FROM public.permissions
          WHERE slug = ANY($1::text[])
            AND deleted_at IS NULL
        `,
        [[...ADMIN_PERMISSION_SLUGS]],
      );

    const available = new Set(
      permissions.map((permission) => permission.slug),
    );

    for (const slug of ADMIN_PERMISSION_SLUGS) {
      if (!available.has(slug)) {
        throw new Error(
          `Security migration aborted: missing permission ${slug}`,
        );
      }
    }

    // The application must not write directly to protected tables.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.roles, public.role_permissions
      FROM promiseflow_app;
    `);

    // Strengthen the membership helper without changing its signature.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION
        public.is_current_user_active_member(
          p_organization_id uuid
        )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = pg_catalog
      AS $function$
        SELECT EXISTS (
          SELECT 1
          FROM public.memberships m
          JOIN public.users u
            ON u.id = m.user_id
          JOIN public.organizations o
            ON o.id = m.organization_id
          WHERE m.organization_id = p_organization_id
            AND m.user_id = NULLIF(
              current_setting('app.user_id', true),
              ''
            )::uuid
            AND m.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND o.deleted_at IS NULL
        );
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.is_current_user_active_member(uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.is_current_user_active_member(uuid)
      TO promiseflow_app;
    `);

    // Strengthen the existing organization permission helper.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION
        public.current_user_has_organization_permission(
          p_organization_id uuid,
          p_permission_slug text
        )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = pg_catalog
      AS $function$
        SELECT EXISTS (
          SELECT 1
          FROM public.memberships m
          JOIN public.users u
            ON u.id = m.user_id
          JOIN public.organizations o
            ON o.id = m.organization_id
          JOIN public.roles r
            ON r.id = m.role_id
           AND r.organization_id = m.organization_id
          JOIN public.role_permissions rp
            ON rp.role_id = r.id
          JOIN public.permissions p
            ON p.id = rp.permission_id
          WHERE m.organization_id = p_organization_id
            AND m.user_id = NULLIF(
              current_setting('app.user_id', true),
              ''
            )::uuid
            AND m.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND p.slug = p_permission_slug
        );
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION
        public.current_user_has_organization_permission(uuid, text)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION
        public.current_user_has_organization_permission(uuid, text)
      TO promiseflow_app;
    `);

    // Create custom roles only through an authorized database function.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION
        public.create_organization_role(
          p_organization_id uuid,
          p_name text,
          p_slug text,
          p_description text DEFAULT NULL
        )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog
      AS $function$
      DECLARE
        v_role_id uuid;
      BEGIN
        IF NOT public.current_user_has_organization_permission(
          p_organization_id,
          'roles.manage'
        ) THEN
          RAISE EXCEPTION 'Permission denied: roles.manage'
            USING ERRCODE = '42501';
        END IF;

        IF p_name IS NULL
          OR length(btrim(p_name)) = 0
          OR length(p_name) > 100
        THEN
          RAISE EXCEPTION 'Invalid role name'
            USING ERRCODE = '22023';
        END IF;

        IF p_slug IS NULL
          OR length(p_slug) > 100
          OR p_slug !~ '^[a-z][a-z0-9_-]*$'
        THEN
          RAISE EXCEPTION 'Invalid role slug'
            USING ERRCODE = '22023';
        END IF;

        IF p_slug = 'administrator' THEN
          RAISE EXCEPTION 'Reserved role slug'
            USING ERRCODE = '42501';
        END IF;

        INSERT INTO public.roles (
          organization_id,
          name,
          slug,
          description
        )
        VALUES (
          p_organization_id,
          btrim(p_name),
          p_slug,
          p_description
        )
        RETURNING id INTO v_role_id;

        RETURN v_role_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION
        public.create_organization_role(uuid, text, text, text)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION
        public.create_organization_role(uuid, text, text, text)
      TO promiseflow_app;
    `);

    // Assign permissions only to custom roles within the same tenant.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION
        public.assign_role_permission(
          p_role_id uuid,
          p_permission_id uuid
        )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog
      AS $function$
      DECLARE
        v_organization_id uuid;
        v_role_slug text;
        v_permission_slug text;
        v_assignment_id uuid;
      BEGIN
        SELECT r.organization_id, r.slug
        INTO v_organization_id, v_role_slug
        FROM public.roles r
        JOIN public.organizations o
          ON o.id = r.organization_id
        WHERE r.id = p_role_id
          AND r.deleted_at IS NULL
          AND o.deleted_at IS NULL;

        IF v_organization_id IS NULL THEN
          RAISE EXCEPTION 'Role not found'
            USING ERRCODE = '22023';
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          'roles.manage'
        ) THEN
          RAISE EXCEPTION 'Permission denied: roles.manage'
            USING ERRCODE = '42501';
        END IF;

        IF v_role_slug = 'administrator' THEN
          RAISE EXCEPTION
            'Administrator role permissions are protected'
            USING ERRCODE = '42501';
        END IF;

        SELECT p.slug
        INTO v_permission_slug
        FROM public.permissions p
        WHERE p.id = p_permission_id
          AND p.deleted_at IS NULL;

        IF v_permission_slug IS NULL THEN
          RAISE EXCEPTION 'Permission not found'
            USING ERRCODE = '22023';
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          v_permission_slug
        ) THEN
          RAISE EXCEPTION
            'Cannot grant a permission you do not hold'
            USING ERRCODE = '42501';
        END IF;

        INSERT INTO public.role_permissions (
          role_id,
          permission_id
        )
        VALUES (
          p_role_id,
          p_permission_id
        )
        RETURNING id INTO v_assignment_id;

        RETURN v_assignment_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.assign_role_permission(uuid, uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.assign_role_permission(uuid, uuid)
      TO promiseflow_app;
    `);

    // Backfill current administrator roles with the reviewed catalog.
    await queryRunner.query(
      `
        INSERT INTO public.role_permissions (
          role_id,
          permission_id
        )
        SELECT r.id, p.id
        FROM public.roles r
        JOIN public.organizations o
          ON o.id = r.organization_id
        CROSS JOIN public.permissions p
        WHERE r.slug = 'administrator'
          AND r.deleted_at IS NULL
          AND o.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND p.slug = ANY($1::text[])
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `,
      [[...ADMIN_PERMISSION_SLUGS]],
    );

    // Preserve the existing bootstrap workflow and expand its grants.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION
        public.bootstrap_organization(
          p_name text,
          p_slug text
        )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = pg_catalog
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
          RAISE EXCEPTION
            'Current user not found or inactive';
        END IF;

        SELECT COUNT(*)
        INTO v_permission_count
        FROM public.permissions
        WHERE slug IN (
          'audit_logs.read',
          'members.manage',
          'members.read',
          'organizations.update',
          'projects.create',
          'projects.delete',
          'projects.read',
          'projects.update',
          'roles.manage',
          'roles.read',
          'tasks.create',
          'tasks.delete',
          'tasks.read',
          'tasks.update',
          'teams.create',
          'teams.delete',
          'teams.read',
          'teams.update',
          'workflows.create',
          'workflows.delete',
          'workflows.read',
          'workflows.update'
        )
          AND deleted_at IS NULL;

        IF v_permission_count <> 22 THEN
          RAISE EXCEPTION
            'Required administrator permissions are missing';
        END IF;

        INSERT INTO public.organizations (
          name,
          slug
        )
        VALUES (
          p_name,
          p_slug
        )
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
          'audit_logs.read',
          'members.manage',
          'members.read',
          'organizations.update',
          'projects.create',
          'projects.delete',
          'projects.read',
          'projects.update',
          'roles.manage',
          'roles.read',
          'tasks.create',
          'tasks.delete',
          'tasks.read',
          'tasks.update',
          'teams.create',
          'teams.delete',
          'teams.read',
          'teams.update',
          'workflows.create',
          'workflows.delete',
          'workflows.read',
          'workflows.update'
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
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: reverting role and permission ' +
        'security requires a dedicated audited reversal migration.',
    );
  }
}
