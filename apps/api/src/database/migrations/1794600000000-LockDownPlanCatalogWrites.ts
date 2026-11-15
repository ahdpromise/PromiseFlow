
import { MigrationInterface, QueryRunner } from 'typeorm';

export class LockDownPlanCatalogWrites1794600000000
  implements MigrationInterface
{
  name = 'LockDownPlanCatalogWrites1794600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Plan catalog and pricing must not be writable
    // through the regular application database role.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE
        public.plans,
        public.features,
        public.plan_features
      FROM promiseflow_app;
    `);
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: restoring plan catalog write ' +
        'permissions requires a dedicated audited migration.',
    );
  }
}
