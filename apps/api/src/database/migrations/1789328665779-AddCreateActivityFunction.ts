import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreateActivityFunction1789328665779
  implements MigrationInterface
{
  name =
    'AddCreateActivityFunction1789328665779';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.create_activity(
        p_organization_id uuid,
        p_action text,
        p_entity_type text,
        p_entity_id uuid,
        p_metadata jsonb DEFAULT NULL
      )
      RETURNS uuid
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $$
      DECLARE
        v_user_id uuid;
        v_activity_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting(
            'app.user_id',
            true
          ),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION
            'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id =
            p_organization_id
            AND m.user_id =
              v_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active member of this organization';
        END IF;

        IF p_action IS NULL
           OR btrim(p_action) = '' THEN
          RAISE EXCEPTION
            'Activity action is required';
        END IF;

        IF p_entity_type IS NULL
           OR btrim(p_entity_type) = '' THEN
          RAISE EXCEPTION
            'Activity entity type is required';
        END IF;

        INSERT INTO public.activities (
          organization_id,
          user_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES (
          p_organization_id,
          v_user_id,
          btrim(p_action),
          btrim(p_entity_type),
          p_entity_id,
          p_metadata
        )
        RETURNING id
        INTO v_activity_id;

        RETURN v_activity_id;
      END;
      $$;

      REVOKE ALL
      ON FUNCTION public.create_activity(
        uuid,
        text,
        text,
        uuid,
        jsonb
      )
      FROM PUBLIC;

      GRANT EXECUTE
      ON FUNCTION public.create_activity(
        uuid,
        text,
        text,
        uuid,
        jsonb
      )
      TO promiseflow_app;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS
      public.create_activity(
        uuid,
        text,
        text,
        uuid,
        jsonb
      );
    `);
  }
}