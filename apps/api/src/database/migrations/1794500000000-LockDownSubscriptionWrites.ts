
import { MigrationInterface, QueryRunner } from 'typeorm';

export class LockDownSubscriptionWrites1794500000000
  implements MigrationInterface
{
  name = 'LockDownSubscriptionWrites1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Subscription billing state must not be writable
    // through the regular application database role.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.subscriptions
      FROM promiseflow_app;
    `);
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: restoring subscription write ' +
        'permissions requires a dedicated audited migration.',
    );
  }
}
