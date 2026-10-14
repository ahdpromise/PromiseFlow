import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AddSoftDeleteNotificationFunction1790000000000
  implements MigrationInterface
{
  name =
    'AddSoftDeleteNotificationFunction1790000000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.soft_delete_notification(
        p_notification_id uuid
      )
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'pg_catalog'
      AS $function$
      DECLARE
        v_user_id uuid;
      BEGIN
        v_user_id :=
          public.current_app_user_id();

        IF v_user_id IS NULL THEN
          RETURN false;
        END IF;

        UPDATE public.notifications
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = p_notification_id
          AND user_id = v_user_id
          AND deleted_at IS NULL;

        RETURN FOUND;
      END;
      $function$;
    `);

    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.soft_delete_notification(uuid)
      FROM PUBLIC
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.soft_delete_notification(uuid)
      TO promiseflow_app
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS
      public.soft_delete_notification(uuid)
    `);
  }
}