import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLoginFunction1788951537639
  implements MigrationInterface
{
  name = 'AddUserLoginFunction1788951537639';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.get_user_for_login(
        p_email text
      )
      RETURNS TABLE (
        id uuid,
        first_name text,
        last_name text,
        email text,
        password_hash text
      )
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
        SELECT
          u.id,
          u.first_name::text,
          u.last_name::text,
          u.email::text,
          u.password_hash::text
        FROM public.users u
        WHERE lower(u.email::text) = lower(btrim(p_email))
          AND u.deleted_at IS NULL
        LIMIT 1;
      $$;

      REVOKE ALL
      ON FUNCTION public.get_user_for_login(text)
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.get_user_for_login(text)
      TO promiseflow_app;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS
      public.get_user_for_login(text);
    `);
  }
}