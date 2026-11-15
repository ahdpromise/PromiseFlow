
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurePermissionCatalog1794400000000
  implements MigrationInterface
{
  name = 'SecurePermissionCatalog1794400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verify the expected table exists before changing privileges.
    const tables: Array<{ table_name: string | null }> =
      await queryRunner.query(`
        SELECT to_regclass('public.permissions')::text
          AS table_name
      `);

    if (!tables[0]?.table_name) {
      throw new Error(
        'Security migration aborted: public.permissions does not exist',
      );
    }

    // The application may read the permission catalog,
    // but must not modify it directly.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.permissions
      FROM promiseflow_app;
    `);

    await queryRunner.query(`
      GRANT SELECT
      ON TABLE public.permissions
      TO promiseflow_app;
    `);

    // Verify the final application privileges.
    const privileges: Array<{
      can_select: boolean;
      can_insert: boolean;
      can_update: boolean;
      can_delete: boolean;
    }> = await queryRunner.query(`
      SELECT
        has_table_privilege(
          'promiseflow_app',
          'public.permissions',
          'SELECT'
        ) AS can_select,
        has_table_privilege(
          'promiseflow_app',
          'public.permissions',
          'INSERT'
        ) AS can_insert,
        has_table_privilege(
          'promiseflow_app',
          'public.permissions',
          'UPDATE'
        ) AS can_update,
        has_table_privilege(
          'promiseflow_app',
          'public.permissions',
          'DELETE'
        ) AS can_delete
    `);

    const result = privileges[0];

    if (
      !result ||
      !result.can_select ||
      result.can_insert ||
      result.can_update ||
      result.can_delete
    ) {
      throw new Error(
        'Security migration aborted: permission catalog privileges are unsafe',
      );
    }
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: restoring permission catalog ' +
        'write privileges requires a dedicated audited migration.',
    );
  }
}
