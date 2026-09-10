import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToMemberships1788815824923
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure every active organization has an Administrator role.
    await queryRunner.query(`
      INSERT INTO public.roles (
        organization_id,
        name,
        slug,
        description
      )
      SELECT
        o.id,
        'Administrator',
        'administrator',
        'Default administrator role'
      FROM public.organizations o
      WHERE o.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.organization_id = o.id
            AND r.slug = 'administrator'
        );
    `);

    // 2. Add role_id as nullable temporarily so existing memberships can be backfilled.
    await queryRunner.query(`
      ALTER TABLE public.memberships
      ADD COLUMN role_id uuid;
    `);

    // 3. Assign the Administrator role to all existing active memberships.
    await queryRunner.query(`
      UPDATE public.memberships m
      SET role_id = r.id
      FROM public.roles r
      WHERE r.organization_id = m.organization_id
        AND r.slug = 'administrator'
        AND r.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND m.role_id IS NULL;
    `);

    // 4. Existing soft-deleted memberships must also receive a valid role
    // before role_id can become NOT NULL.
    await queryRunner.query(`
      UPDATE public.memberships m
      SET role_id = r.id
      FROM public.roles r
      WHERE r.organization_id = m.organization_id
        AND r.slug = 'administrator'
        AND r.deleted_at IS NULL
        AND m.role_id IS NULL;
    `);

    // 5. role_id is required for every membership.
    await queryRunner.query(`
      ALTER TABLE public.memberships
      ALTER COLUMN role_id SET NOT NULL;
    `);

    // 6. A membership role must reference an existing role.
    await queryRunner.query(`
      ALTER TABLE public.memberships
      ADD CONSTRAINT FK_memberships_role
      FOREIGN KEY (role_id)
      REFERENCES public.roles(id)
      ON DELETE RESTRICT;
    `);

    // 7. Helpful index for role-based membership lookups.
    await queryRunner.query(`
      CREATE INDEX IDX_memberships_role_id
      ON public.memberships(role_id);
    `);

    // 8. Update tenant bootstrap:
    // Organization -> Administrator role -> owner membership.
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

          RETURN v_organization_id;
      END;
      $function$;
    `);

    // Keep execution restricted to the backend application role.
    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.bootstrap_organization(text, text)
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.bootstrap_organization(text, text)
      TO promiseflow_app;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the previous bootstrap behavior first.
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
      BEGIN
          v_user_id := NULLIF(
              current_setting('app.user_id', true),
              ''
          )::uuid;

          IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'app.user_id is not set';
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

          INSERT INTO public.memberships (
              user_id,
              organization_id
          )
          VALUES (
              v_user_id,
              v_organization_id
          );

          RETURN v_organization_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.bootstrap_organization(text, text)
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.bootstrap_organization(text, text)
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.IDX_memberships_role_id;
    `);

    await queryRunner.query(`
      ALTER TABLE public.memberships
      DROP CONSTRAINT IF EXISTS FK_memberships_role;
    `);

    await queryRunner.query(`
      ALTER TABLE public.memberships
      DROP COLUMN IF EXISTS role_id;
    `);
  }
}