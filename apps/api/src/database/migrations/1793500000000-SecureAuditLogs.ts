
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureAuditLogs1793500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO public.permissions (
        name,
        slug,
        description
      )
      VALUES (
        'Read Audit Logs',
        'audit_logs.read',
        'View organization audit logs'
      )
      ON CONFLICT (slug) DO NOTHING;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF (
          SELECT COUNT(*)
          FROM public.permissions
          WHERE slug IN (
            'organizations.update',
            'members.manage',
            'roles.manage',
            'audit_logs.read'
          )
            AND deleted_at IS NULL
        ) <> 4 THEN
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
        AND p.slug = 'audit_logs.read'
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

      REVOKE ALL
      ON FUNCTION public.accept_invitation(text)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.accept_invitation(text)
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS audit_logs_tenant_select
      ON public.audit_logs;

      CREATE POLICY audit_logs_tenant_select
      ON public.audit_logs
      FOR SELECT
      TO promiseflow_app
      USING (
        public.current_user_has_organization_permission(
          organization_id,
          'audit_logs.read'
        )
      );
    `);

    await queryRunner.query(`
      REVOKE ALL ON TABLE public.audit_logs
      FROM PUBLIC;

      REVOKE INSERT, UPDATE, DELETE, TRUNCATE
      ON TABLE public.audit_logs
      FROM promiseflow_app;

      GRANT SELECT
      ON TABLE public.audit_logs
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      CREATE FUNCTION public.create_audit_log(
        p_organization_id uuid,
        p_user_id uuid,
        p_action text,
        p_entity_type text,
        p_entity_id uuid,
        p_metadata jsonb DEFAULT NULL,
        p_ip_address inet DEFAULT NULL,
        p_user_agent text DEFAULT NULL
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
      DECLARE
        v_current_user_id uuid;
        v_audit_log_id uuid;
      BEGIN
        v_current_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_current_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF p_user_id IS DISTINCT FROM v_current_user_id THEN
          RAISE EXCEPTION
            'Audit log user does not match current user';
        END IF;

        IF NOT public.is_current_user_active_member(
          p_organization_id
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active organization member';
        END IF;

        IF NULLIF(btrim(p_action), '') IS NULL
           OR length(p_action) > 100 THEN
          RAISE EXCEPTION 'Invalid audit action';
        END IF;

        IF NULLIF(btrim(p_entity_type), '') IS NULL
           OR length(p_entity_type) > 100 THEN
          RAISE EXCEPTION 'Invalid audit entity type';
        END IF;

        IF p_entity_id IS NULL THEN
          RAISE EXCEPTION 'Audit entity ID is required';
        END IF;

        INSERT INTO public.audit_logs (
          organization_id,
          user_id,
          action,
          entity_type,
          entity_id,
          metadata,
          ip_address,
          user_agent
        )
        VALUES (
          p_organization_id,
          p_user_id,
          p_action,
          p_entity_type,
          p_entity_id,
          p_metadata,
          p_ip_address,
          p_user_agent
        )
        RETURNING id INTO v_audit_log_id;

        RETURN v_audit_log_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.create_audit_log(
        uuid, uuid, text, text, uuid, jsonb, inet, text
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.create_audit_log(
        uuid, uuid, text, text, uuid, jsonb, inet, text
      )
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: audit log permissions and ' +
        'security policies may already be in use. Create a ' +
        'dedicated audited reversal migration if necessary.',
    );
  }
}
