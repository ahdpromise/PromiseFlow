import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAuthFunctions1788950312670
  implements MigrationInterface
{
  name = 'AddUserAuthFunctions1788950312670';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.register_user(
        p_first_name text,
        p_last_name text,
        p_email text,
        p_password_hash text
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_user_id uuid;
      BEGIN
        IF p_first_name IS NULL
           OR btrim(p_first_name) = '' THEN
          RAISE EXCEPTION 'First name is required';
        END IF;

        IF p_last_name IS NULL
           OR btrim(p_last_name) = '' THEN
          RAISE EXCEPTION 'Last name is required';
        END IF;

        IF p_email IS NULL
           OR btrim(p_email) = '' THEN
          RAISE EXCEPTION 'Email is required';
        END IF;

        IF p_password_hash IS NULL
           OR btrim(p_password_hash) = '' THEN
          RAISE EXCEPTION 'Password hash is required';
        END IF;

        INSERT INTO public.users (
          first_name,
          last_name,
          email,
          password_hash
        )
        VALUES (
          btrim(p_first_name),
          btrim(p_last_name),
          lower(btrim(p_email)),
          p_password_hash
        )
        RETURNING id INTO v_user_id;

        RETURN v_user_id;
      END;
      $$;

      REVOKE ALL
      ON FUNCTION public.register_user(
        text,
        text,
        text,
        text
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.register_user(
        text,
        text,
        text,
        text
      )
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.update_current_user_password(
        p_password_hash text
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
          current_setting(
            'app.user_id',
            true
          ),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF p_password_hash IS NULL
           OR btrim(p_password_hash) = '' THEN
          RAISE EXCEPTION 'Password hash is required';
        END IF;

        UPDATE public.users
        SET
          password_hash = p_password_hash,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_user_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Active user not found';
        END IF;
      END;
      $$;

      REVOKE ALL
      ON FUNCTION public.update_current_user_password(
        text
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.update_current_user_password(
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
      public.update_current_user_password(text);
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS
      public.register_user(
        text,
        text,
        text,
        text
      );
    `);
  }
}