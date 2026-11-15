
import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenApiKeysWebhooksReadAccess1794900000000
  implements MigrationInterface
{
  name = 'HardenApiKeysWebhooksReadAccess1794900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const permission of [
      'api_keys.manage',
      'webhooks.manage',
    ]) {
      const result: Array<{ exists: boolean }> =
        await queryRunner.query(
          `
          SELECT EXISTS (
            SELECT 1
            FROM public.permissions
            WHERE slug = $1
              AND deleted_at IS NULL
          ) AS exists;
          `,
          [permission],
        );

      if (!result[0]?.exists) {
        throw new Error(`Missing permission: ${permission}`);
      }
    }

    await queryRunner.query(`
      ALTER POLICY api_keys_tenant_select
      ON public.api_keys
      USING (
        public.is_current_user_active_member(organization_id)
        AND public.current_user_has_organization_permission(
          organization_id,
          'api_keys.manage'
        )
      );
    `);

    await queryRunner.query(`
      ALTER POLICY webhooks_tenant_select
      ON public.webhooks
      USING (
        public.is_current_user_active_member(organization_id)
        AND public.current_user_has_organization_permission(
          organization_id,
          'webhooks.manage'
        )
      );
    `);

    await queryRunner.query(`
      ALTER POLICY webhook_deliveries_tenant_select
      ON public.webhook_deliveries
      USING (
        EXISTS (
          SELECT 1
          FROM public.webhooks w
          WHERE w.id = webhook_id
            AND public.is_current_user_active_member(
              w.organization_id
            )
            AND public.current_user_has_organization_permission(
              w.organization_id,
              'webhooks.manage'
            )
        )
      );
    `);

    await queryRunner.query(`
      GRANT SELECT
      ON TABLE public.webhook_deliveries
      TO promiseflow_app;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error(
      'Unsafe rollback prevented: use an audited reversal migration.',
    );
  }
}
