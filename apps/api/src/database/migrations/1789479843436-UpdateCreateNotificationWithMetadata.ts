import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class UpdateCreateNotificationWithMetadata1789479843436
  implements MigrationInterface
{
  name =
    'UpdateCreateNotificationWithMetadata1789479843436';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.create_notification(
        p_organization_id uuid,
        p_user_id uuid,
        p_type text,
        p_title text,
        p_message text,
        p_metadata jsonb
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_current_user_id uuid;
        v_notification_id uuid;
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

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id =
            p_organization_id
            AND m.user_id =
              p_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Notification recipient is not an active member of this organization';
        END IF;

        IF p_type IS NULL
           OR btrim(p_type) = '' THEN
          RAISE EXCEPTION
            'Notification type is required';
        END IF;

        IF p_title IS NULL
           OR btrim(p_title) = '' THEN
          RAISE EXCEPTION
            'Notification title is required';
        END IF;

        IF p_message IS NULL
           OR btrim(p_message) = '' THEN
          RAISE EXCEPTION
            'Notification message is required';
        END IF;

        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          metadata
        )
        VALUES (
          p_user_id,
          btrim(p_type),
          btrim(p_title),
          btrim(p_message),
          p_metadata
        )
        RETURNING id
        INTO v_notification_id;

        RETURN v_notification_id;
      END;
      $$;

      REVOKE ALL
      ON FUNCTION public.create_notification(
        uuid,
        uuid,
        text,
        text,
        text,
        jsonb
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.create_notification(
        uuid,
        uuid,
        text,
        text,
        text,
        jsonb
      )
      TO promiseflow_app;

      DROP FUNCTION IF EXISTS
      public.create_notification(
        uuid,
        uuid,
        text,
        text,
        text
      );
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.create_notification(
        p_organization_id uuid,
        p_user_id uuid,
        p_type text,
        p_title text,
        p_message text
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_current_user_id uuid;
        v_notification_id uuid;
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

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id =
            p_organization_id
            AND m.user_id =
              p_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Notification recipient is not an active member of this organization';
        END IF;

        IF p_type IS NULL
           OR btrim(p_type) = '' THEN
          RAISE EXCEPTION
            'Notification type is required';
        END IF;

        IF p_title IS NULL
           OR btrim(p_title) = '' THEN
          RAISE EXCEPTION
            'Notification title is required';
        END IF;

        IF p_message IS NULL
           OR btrim(p_message) = '' THEN
          RAISE EXCEPTION
            'Notification message is required';
        END IF;

        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message
        )
        VALUES (
          p_user_id,
          btrim(p_type),
          btrim(p_title),
          btrim(p_message)
        )
        RETURNING id
        INTO v_notification_id;

        RETURN v_notification_id;
      END;
      $$;

      REVOKE ALL
      ON FUNCTION public.create_notification(
        uuid,
        uuid,
        text,
        text,
        text
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.create_notification(
        uuid,
        uuid,
        text,
        text,
        text
      )
      TO promiseflow_app;

      DROP FUNCTION IF EXISTS
      public.create_notification(
        uuid,
        uuid,
        text,
        text,
        text,
        jsonb
      );
    `);
  }
}