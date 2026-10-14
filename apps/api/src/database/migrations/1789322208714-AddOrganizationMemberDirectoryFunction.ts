import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationMemberDirectoryFunction1789322208714
  implements MigrationInterface
{
  name =
    'AddOrganizationMemberDirectoryFunction1789322208714';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION
      public.get_organization_member_directory(
        p_organization_id uuid
      )
      RETURNS TABLE (
        membership_id uuid,
        user_id uuid,
        first_name text,
        last_name text,
        email text,
        role_id uuid
      )
      LANGUAGE plpgsql
      STABLE
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_current_user_id uuid;
      BEGIN
        v_current_user_id := NULLIF(
          current_setting(
            'app.user_id',
            true
          ),
          ''
        )::uuid;

        IF v_current_user_id IS NULL THEN
          RAISE EXCEPTION
            'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id =
            p_organization_id
            AND m.user_id =
              v_current_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active member of this organization';
        END IF;

        RETURN QUERY
        SELECT
          m.id AS membership_id,
          u.id AS user_id,
          u.first_name::text,
          u.last_name::text,
          u.email::text,
          m.role_id
        FROM public.memberships m
        INNER JOIN public.users u
          ON u.id = m.user_id
        WHERE m.organization_id =
          p_organization_id
          AND m.deleted_at IS NULL
          AND u.deleted_at IS NULL
        ORDER BY
          u.first_name,
          u.last_name,
          u.email;
      END;
      $$;

      REVOKE ALL
      ON FUNCTION
      public.get_organization_member_directory(uuid)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION
      public.get_organization_member_directory(uuid)
      TO promiseflow_app;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS
      public.get_organization_member_directory(uuid);
    `);
  }
}