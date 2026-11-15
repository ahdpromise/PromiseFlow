
import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecureApiKeysAndWebhooks1794800000000
  implements MigrationInterface
{
  name = 'SecureApiKeysAndWebhooks1794800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Verify the required permissions.
    const permissions: Array<{ slug: string }> =
      await queryRunner.query(`
        SELECT slug
        FROM public.permissions
        WHERE slug IN (
          'api_keys.manage',
          'webhooks.manage'
        )
          AND deleted_at IS NULL;
      `);

    const availablePermissions = new Set(
      permissions.map((permission) => permission.slug),
    );

    for (const permission of [
      'api_keys.manage',
      'webhooks.manage',
    ]) {
      if (!availablePermissions.has(permission)) {
        throw new Error(
          `Security migration aborted: missing permission ${permission}`,
        );
      }
    }

    // 2. Verify the RBAC helper exists.
    const helpers: Array<{ exists: boolean }> =
      await queryRunner.query(`
        SELECT to_regprocedure(
          'public.current_user_has_organization_permission(uuid,text)'
        ) IS NOT NULL AS exists;
      `);

    if (!helpers[0]?.exists) {
      throw new Error(
        'Security migration aborted: RBAC helper is missing',
      );
    }

    // 3. Secure API key INSERT.
    await queryRunner.query(`
      ALTER POLICY api_keys_tenant_insert
      ON public.api_keys
      WITH CHECK (
        public.is_current_user_active_member(
          organization_id
        )
        AND public.current_user_has_organization_permission(
          organization_id,
          'api_keys.manage'
        )
      );
    `);

    // 4. Secure API key UPDATE.
    await queryRunner.query(`
      ALTER POLICY api_keys_tenant_update
      ON public.api_keys
      USING (
        public.is_current_user_active_member(
          organization_id
        )
        AND public.current_user_has_organization_permission(
          organization_id,
          'api_keys.manage'
        )
      )
      WITH CHECK (
        public.is_current_user_active_member(
          organization_id
        )
        AND public.current_user_has_organization_permission(
          organization_id,
          'api_keys.manage'
        )
      );
    `);

    // 5. Secure Webhook INSERT.
    await queryRunner.query(`
      ALTER POLICY webhooks_tenant_insert
      ON public.webhooks
      WITH CHECK (
        public.is_current_user_active_member(
          organization_id
        )
        AND public.current_user_has_organization_permission(
          organization_id,
          'webhooks.manage'
        )
      );
    `);

    // 6. Secure Webhook UPDATE.
    await queryRunner.query(`
      ALTER POLICY webhooks_tenant_update
      ON public.webhooks
      USING (
        public.is_current_user_active_member(
          organization_id
        )
        AND public.current_user_has_organization_permission(
          organization_id,
          'webhooks.manage'
        )
      )
      WITH CHECK (
        public.is_current_user_active_member(
          organization_id
        )
        AND public.current_user_has_organization_permission(
          organization_id,
          'webhooks.manage'
        )
      );
    `);

    // 7. Restrict API key table privileges.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.api_keys
      FROM promiseflow_app;

      GRANT SELECT, INSERT
      ON TABLE public.api_keys
      TO promiseflow_app;

      GRANT UPDATE (
        revoked_at,
        updated_at
      )
      ON TABLE public.api_keys
      TO promiseflow_app;
    `);

    // 8. Restrict Webhook table privileges.
    await queryRunner.query(`
      REVOKE INSERT, UPDATE, DELETE
      ON TABLE public.webhooks
      FROM promiseflow_app;

      GRANT SELECT, INSERT
      ON TABLE public.webhooks
      TO promiseflow_app;

      GRANT UPDATE (
        name,
        url,
        events,
        is_active,
        updated_at
      )
      ON TABLE public.webhooks
      TO promiseflow_app;
    `);
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: reverting API Keys and ' +
        'Webhooks security would restore weaker authorization. ' +
        'Create a dedicated audited reversal migration.',
    );
  }
}
