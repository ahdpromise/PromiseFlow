import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestrictMigrationTableWriteAccess1795300000000
  implements MigrationInterface
{
  name = 'RestrictMigrationTableWriteAccess1795300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      REVOKE INSERT, UPDATE
      ON TABLE public.migrations
      FROM promiseflow_app;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      GRANT INSERT, UPDATE
      ON TABLE public.migrations
      TO promiseflow_app;
    `);
  }
}