import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureInvitationPermissions1793300000000
  implements MigrationInterface
{
  name = 'SecureInvitationPermissions1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION public.current_user_has_organization_permission(
        p_organization_id uuid,
        p_permission_slug text
      )
      RETURNS boolean
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
        SELECT EXISTS (
          SELECT 1
          FROM public.memberships m
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
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND p.slug = p_permission_slug
        );
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL ON FUNCTION
        public.current_user_has_organization_permission(uuid, text)
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE ON FUNCTION
        public.current_user_has_organization_permission(uuid, text)
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      ALTER POLICY invitations_tenant_select
      ON public.invitations
      USING (
        deleted_at IS NULL
        AND public.current_user_has_organization_permission(
          organization_id,
          'members.manage'
        )
      );
    `);

    await queryRunner.query(`
      ALTER POLICY invitations_tenant_insert
      ON public.invitations
      WITH CHECK (
        public.current_user_has_organization_permission(
          organization_id,
          'members.manage'
        )
        AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = invitations.role_id
            AND r.organization_id = invitations.organization_id
            AND r.deleted_at IS NULL
        )
      );
    `);

    await queryRunner.query(`
      ALTER POLICY invitations_tenant_update
      ON public.invitations
      USING (
        deleted_at IS NULL
        AND public.current_user_has_organization_permission(
          organization_id,
          'members.manage'
        )
      )
      WITH CHECK (
        public.current_user_has_organization_permission(
          organization_id,
          'members.manage'
        )
        AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = invitations.role_id
            AND r.organization_id = invitations.organization_id
            AND r.deleted_at IS NULL
        )
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER POLICY invitations_tenant_select
      ON public.invitations
      USING (
        deleted_at IS NULL
        AND public.is_current_user_active_member(organization_id)
      );
    `);

    await queryRunner.query(`
      ALTER POLICY invitations_tenant_insert
      ON public.invitations
      WITH CHECK (
        public.is_current_user_active_member(organization_id)
        AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = invitations.role_id
            AND r.organization_id = invitations.organization_id
            AND r.deleted_at IS NULL
        )
      );
    `);

    await queryRunner.query(`
      ALTER POLICY invitations_tenant_update
      ON public.invitations
      USING (
        deleted_at IS NULL
        AND public.is_current_user_active_member(organization_id)
      )
      WITH CHECK (
        public.is_current_user_active_member(organization_id)
        AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = invitations.role_id
            AND r.organization_id = invitations.organization_id
            AND r.deleted_at IS NULL
        )
      );
    `);

    await queryRunner.query(`
      DROP FUNCTION public.current_user_has_organization_permission(
        uuid,
        text
      );
    `);
  }
}