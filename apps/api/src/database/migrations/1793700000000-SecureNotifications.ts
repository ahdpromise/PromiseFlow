
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureNotifications1793700000000
  implements MigrationInterface
{
  name = 'SecureNotifications1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.notifications
      FROM promiseflow_app;
    `);

    await queryRunner.query(`
      GRANT SELECT
      ON TABLE public.notifications
      TO promiseflow_app;

      GRANT UPDATE (read_at)
      ON TABLE public.notifications
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.create_notification(
        p_organization_id uuid,
        p_user_id uuid,
        p_type text,
        p_title text,
        p_message text,
        p_metadata jsonb,
        p_target_path text DEFAULT NULL
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
      DECLARE
        v_current_user_id uuid;
        v_notification_id uuid;
      BEGIN
        v_current_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_current_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = v_current_user_id
            AND u.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION 'Current user not found or inactive';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = v_current_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active member of this organization';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = p_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Notification recipient is not an active member of this organization';
        END IF;

        IF p_type IS NULL OR pg_catalog.btrim(p_type) = '' THEN
          RAISE EXCEPTION 'Notification type is required';
        END IF;

        IF p_title IS NULL OR pg_catalog.btrim(p_title) = '' THEN
          RAISE EXCEPTION 'Notification title is required';
        END IF;

        IF p_message IS NULL OR pg_catalog.btrim(p_message) = '' THEN
          RAISE EXCEPTION 'Notification message is required';
        END IF;

        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          target_path
        )
        VALUES (
          p_user_id,
          pg_catalog.btrim(p_type),
          pg_catalog.btrim(p_title),
          pg_catalog.btrim(p_message),
          p_metadata,
          p_target_path
        )
        RETURNING id INTO v_notification_id;

        RETURN v_notification_id;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.create_notification(
        uuid, uuid, text, text, text, jsonb, text
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.create_notification(
        uuid, uuid, text, text, text, jsonb, text
      )
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: notification security ' +
        'changes may already be in use. Create a dedicated ' +
        'audited reversal migration if necessary.',
    );
  }
}
