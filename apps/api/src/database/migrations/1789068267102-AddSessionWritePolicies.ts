import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionWritePolicies1789068267102
  implements MigrationInterface
{
  name = 'AddSessionWritePolicies1789068267102';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE POLICY sessions_user_insert
      ON public.sessions
      FOR INSERT
      TO promiseflow_app
      WITH CHECK (
        user_id = NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid
      );
    `);

    await queryRunner.query(`
      CREATE POLICY sessions_user_update
      ON public.sessions
      FOR UPDATE
      TO promiseflow_app
      USING (
        user_id = NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid
      )
      WITH CHECK (
        user_id = NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid
      );
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS
      sessions_user_update
      ON public.sessions;
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS
      sessions_user_insert
      ON public.sessions;
    `);
  }
}