import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdateCurrentUserProfile1792100000000
  implements MigrationInterface
{
  name = 'AddUpdateCurrentUserProfile1792100000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION public.update_current_user_profile(
        p_first_name text,
        p_last_name text
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_user_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF p_first_name IS NULL
           OR btrim(p_first_name) = '' THEN
          RAISE EXCEPTION 'First name is required';
        END IF;

        IF p_last_name IS NULL
           OR btrim(p_last_name) = '' THEN
          RAISE EXCEPTION 'Last name is required';
        END IF;

        UPDATE public.users
        SET
          first_name = btrim(p_first_name),
          last_name = btrim(p_last_name),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_user_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Active user not found';
        END IF;
      END;
      $$;

      REVOKE ALL
      ON FUNCTION public.update_current_user_profile(
        text,
        text
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.update_current_user_profile(
        text,
        text
      )
      TO promiseflow_app;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS
      public.update_current_user_profile(text, text);
    `);
  }
}