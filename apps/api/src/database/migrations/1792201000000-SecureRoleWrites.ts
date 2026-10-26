
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureRoleWrites1792201000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.roles
      FROM promiseflow_app;
    `);

    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.role_permissions
      FROM promiseflow_app;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      GRANT INSERT, UPDATE, DELETE
      ON TABLE public.roles
      TO promiseflow_app;
    `);

    await queryRunner.query(`
      GRANT INSERT, UPDATE, DELETE
      ON TABLE public.role_permissions
      TO promiseflow_app;
    `);
  }
}
