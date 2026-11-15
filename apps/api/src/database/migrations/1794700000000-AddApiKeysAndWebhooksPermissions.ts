
import { MigrationInterface, QueryRunner } from 'typeorm';

const NEW_PERMISSIONS = [
  {
    slug: 'api_keys.manage',
    name: 'Manage API Keys',
    description: 'Create and revoke organization API keys',
  },
  {
    slug: 'webhooks.manage',
    name: 'Manage Webhooks',
    description: 'Create, update and deactivate organization webhooks',
  },
] as const;

const ADMIN_PERMISSION_SLUGS = [
  'audit_logs.read',
  'api_keys.manage',
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
  'webhooks.manage',
  'workflows.create',
  'workflows.delete',
  'workflows.read',
  'workflows.update',
] as const;

export class AddApiKeysAndWebhooksPermissions1794700000000
  implements MigrationInterface
{
  name = 'AddApiKeysAndWebhooksPermissions1794700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fail if a permission slug exists but is soft-deleted.
    const existing: Array<{
      slug: string;
      deleted_at: Date | null;
    }> = await queryRunner.query(
      `
        SELECT slug, deleted_at
        FROM public.permissions
        WHERE slug = ANY($1::text[])
      `,
      [NEW_PERMISSIONS.map((permission) => permission.slug)],
    );

    for (const permission of existing) {
      if (permission.deleted_at !== null) {
        throw new Error(
          `Security migration aborted: inactive permission ${permission.slug}`,
        );
      }
    }

    // Register the two new permissions without changing existing rows.
    for (const permission of NEW_PERMISSIONS) {
      await queryRunner.query(
        `
          INSERT INTO public.permissions (
            slug,
            name,
            description
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (slug) DO NOTHING
        `,
        [
          permission.slug,
          permission.name,
          permission.description,
        ],
      );
    }

    // Require the complete reviewed administrator permission catalog.
    const available: Array<{ slug: string }> =
      await queryRunner.query(
        `
          SELECT slug
          FROM public.permissions
          WHERE slug = ANY($1::text[])
            AND deleted_at IS NULL
        `,
        [[...ADMIN_PERMISSION_SLUGS]],
      );

    const availableSlugs = new Set(
      available.map((permission) => permission.slug),
    );

    for (const slug of ADMIN_PERMISSION_SLUGS) {
      if (!availableSlugs.has(slug)) {
        throw new Error(
          `Security migration aborted: missing permission ${slug}`,
        );
      }
    }

    // Backfill existing active administrator roles.
    await queryRunner.query(
      `
        INSERT INTO public.role_permissions (
          role_id,
          permission_id
        )
        SELECT
          r.id,
          p.id
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
      [NEW_PERMISSIONS.map((permission) => permission.slug)],
    );

    // Preserve the existing bootstrap behavior, expanding 22 grants to 24.
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
          'api_keys.manage',
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
          'webhooks.manage',
          'workflows.create',
          'workflows.delete',
          'workflows.read',
          'workflows.update'
        )
          AND deleted_at IS NULL;

        IF v_permission_count <> 24 THEN
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
          'api_keys.manage',
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
          'webhooks.manage',
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

    // Keep the bootstrap function callable only by the application role.
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
      'Unsafe rollback prevented: removing security permissions ' +
        'requires a dedicated audited reversal migration.',
    );
  }
}
