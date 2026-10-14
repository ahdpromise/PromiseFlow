import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AddAutomationRunsWritePolicies1790001000000
  implements MigrationInterface
{
  name =
    'AddAutomationRunsWritePolicies1790001000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS
        automation_runs_tenant_insert
      ON public.automation_runs
    `);

    await queryRunner.query(`
      CREATE POLICY
        automation_runs_tenant_insert
      ON public.automation_runs
      FOR INSERT
      TO promiseflow_app
      WITH CHECK (
        public.is_current_user_active_member(
          organization_id
        )
      )
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS
        automation_runs_tenant_update
      ON public.automation_runs
    `);

    await queryRunner.query(`
      CREATE POLICY
        automation_runs_tenant_update
      ON public.automation_runs
      FOR UPDATE
      TO promiseflow_app
      USING (
        public.is_current_user_active_member(
          organization_id
        )
      )
      WITH CHECK (
        public.is_current_user_active_member(
          organization_id
        )
      )
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS
        automation_runs_tenant_update
      ON public.automation_runs
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS
        automation_runs_tenant_insert
      ON public.automation_runs
    `);
  }
}