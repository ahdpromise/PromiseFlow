
import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestrictLegacyNotificationExecute1793800000000
  implements MigrationInterface
{
  name = 'RestrictLegacyNotificationExecute1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      REVOKE EXECUTE
      ON FUNCTION public.create_notification(
        uuid, uuid, text, text, text, jsonb
      )
      FROM PUBLIC;
    `);

    await queryRunner.query(`
      GRANT EXECUTE
      ON FUNCTION public.create_notification(
        uuid, uuid, text, text, text, jsonb
      )
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: restoring PUBLIC EXECUTE ' +
        'would weaken notification security. Create a dedicated ' +
        'audited reversal migration if necessary.',
    );
  }
}
