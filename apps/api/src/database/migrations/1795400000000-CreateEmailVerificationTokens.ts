import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class CreateEmailVerificationTokens1795400000000
  implements MigrationInterface
{
  name = 'CreateEmailVerificationTokens1795400000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.email_verification_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

        email public.citext NOT NULL,

        token_hash varchar(64) NOT NULL UNIQUE,

        created_at timestamptz NOT NULL DEFAULT now(),

        expires_at timestamptz NOT NULL,

        consumed_at timestamptz,

        CONSTRAINT email_verification_email_length
          CHECK (
            char_length(email::text)
            BETWEEN 3 AND 255
          ),

        CONSTRAINT email_verification_token_hash_format
          CHECK (
            token_hash ~ '^[0-9a-f]{64}$'
          ),

        CONSTRAINT email_verification_expiry
          CHECK (
            expires_at > created_at
          ),

        CONSTRAINT email_verification_consumed_at
          CHECK (
            consumed_at IS NULL
            OR (
              consumed_at >= created_at
              AND consumed_at < expires_at
            )
          )
      );

      CREATE INDEX idx_email_verification_email
        ON public.email_verification_tokens (email);

      CREATE INDEX idx_email_verification_expires_at
        ON public.email_verification_tokens (expires_at);

      ALTER TABLE public.email_verification_tokens
        ENABLE ROW LEVEL SECURITY;

      REVOKE ALL
        ON TABLE public.email_verification_tokens
        FROM PUBLIC, promiseflow_app;

      CREATE UNIQUE INDEX idx_users_normalized_email
        ON public.users (
          lower(btrim(email::text))
        );

      CREATE FUNCTION public.request_email_verification(
        p_email text,
        p_token_hash text
      )
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_email text;
      BEGIN
        v_email := lower(btrim(p_email));

        IF v_email IS NULL
           OR char_length(v_email)
              NOT BETWEEN 3 AND 255
           OR position('@' IN v_email) = 0 THEN
          RAISE EXCEPTION 'Invalid email address';
        END IF;

        IF p_token_hash IS NULL
           OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
          RAISE EXCEPTION 'Invalid token hash';
        END IF;

        PERFORM pg_advisory_xact_lock(
          hashtextextended(
            'email-verification:' || v_email,
            0
          )
        );

        IF EXISTS (
          SELECT 1
          FROM public.users u
          WHERE lower(btrim(u.email::text)) = v_email
        ) THEN
          RETURN false;
        END IF;

        IF EXISTS (
          SELECT 1
          FROM public.email_verification_tokens t
          WHERE t.email::text = v_email
            AND t.created_at >
              clock_timestamp() - interval '60 seconds'
        ) THEN
          RETURN false;
        END IF;

        IF (
          SELECT count(*)
          FROM public.email_verification_tokens t
          WHERE t.email::text = v_email
            AND t.created_at >
              clock_timestamp() - interval '1 hour'
        ) >= 5 THEN
          RETURN false;
        END IF;

        INSERT INTO public.email_verification_tokens (
          email,
          token_hash,
          expires_at
        )
        VALUES (
          v_email,
          p_token_hash,
          clock_timestamp() + interval '30 minutes'
        );

        RETURN true;
      END;
      $$;

      REVOKE ALL
        ON FUNCTION public.request_email_verification(
          text,
          text
        )
        FROM PUBLIC;

      GRANT EXECUTE
        ON FUNCTION public.request_email_verification(
          text,
          text
        )
        TO promiseflow_app;

      CREATE FUNCTION public.complete_verified_registration(
        p_first_name text,
        p_last_name text,
        p_email text,
        p_password_hash text,
        p_token_hash text
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_email text;
        v_token_id uuid;
        v_user_id uuid;
        v_verified_at timestamptz;
      BEGIN
        v_email := lower(btrim(p_email));

        IF v_email IS NULL
           OR p_token_hash IS NULL
           OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
          RAISE EXCEPTION 'Invalid verification token';
        END IF;

        PERFORM pg_advisory_xact_lock(
          hashtextextended(
            'email-verification:' || v_email,
            0
          )
        );

        SELECT t.id
        INTO v_token_id
        FROM public.email_verification_tokens t
        WHERE t.email::text = v_email
          AND t.token_hash = p_token_hash
          AND t.consumed_at IS NULL
          AND t.expires_at > clock_timestamp()
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION
            'Invalid or expired verification token';
        END IF;

        v_verified_at := clock_timestamp();

        UPDATE public.email_verification_tokens
        SET consumed_at = v_verified_at
        WHERE id = v_token_id
          AND consumed_at IS NULL
          AND expires_at > v_verified_at;

        IF NOT FOUND THEN
          RAISE EXCEPTION
            'Invalid or expired verification token';
        END IF;

        v_user_id := public.register_user(
          p_first_name,
          p_last_name,
          v_email,
          p_password_hash
        );

        UPDATE public.users
        SET email_verified_at = v_verified_at
        WHERE id = v_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION
            'User verification could not be completed';
        END IF;

        RETURN v_user_id;
      END;
      $$;

      REVOKE ALL
        ON FUNCTION public.complete_verified_registration(
          text,
          text,
          text,
          text,
          text
        )
        FROM PUBLIC;

      GRANT EXECUTE
        ON FUNCTION public.complete_verified_registration(
          text,
          text,
          text,
          text,
          text
        )
        TO promiseflow_app;

      REVOKE EXECUTE
        ON FUNCTION public.register_user(
          text,
          text,
          text,
          text
        )
        FROM PUBLIC, promiseflow_app;

      REVOKE INSERT, UPDATE, DELETE
        ON TABLE public.users
        FROM promiseflow_app;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      GRANT INSERT, UPDATE, DELETE
        ON TABLE public.users
        TO promiseflow_app;

      GRANT EXECUTE
        ON FUNCTION public.register_user(
          text,
          text,
          text,
          text
        )
        TO promiseflow_app;

      DROP FUNCTION
        public.complete_verified_registration(
          text,
          text,
          text,
          text,
          text
        );

      DROP FUNCTION
        public.request_email_verification(
          text,
          text
        );

      DROP INDEX public.idx_users_normalized_email;

      DROP TABLE public.email_verification_tokens;
    `);
  }
}