
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureMembershipWrites1792200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.memberships
      FROM promiseflow_app;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      GRANT INSERT, UPDATE, DELETE
      ON TABLE public.memberships
      TO promiseflow_app;
    `);
  }
}
