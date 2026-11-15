
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaxProjectsUsageLimit1795000000000
  implements MigrationInterface
{
  name = 'AddMaxProjectsUsageLimit1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingFeatures: Array<{
      id: string;
      value_type: string;
      is_active: boolean;
    }> = await queryRunner.query(`
      SELECT id, value_type, is_active
      FROM public.features
      WHERE slug = 'max_projects'
    `);

    if (existingFeatures.length > 0) {
      const feature = existingFeatures[0];

      if (
        feature.value_type !== 'number' ||
        feature.is_active !== true
      ) {
        throw new Error(
          'Usage limit migration aborted: incompatible max_projects feature',
        );
      }
    }

    await queryRunner.query(`
      INSERT INTO public.features (
        name,
        slug,
        description,
        value_type,
        is_active
      )
      VALUES (
        'Maximum Projects',
        'max_projects',
        'Maximum number of active projects per organization',
        'number',
        true
      )
      ON CONFLICT (slug) DO NOTHING
    `);

    const plans: Array<{ id: string }> =
      await queryRunner.query(`
        SELECT id
        FROM public.plans
        WHERE name = 'Pro'
      `);

    if (plans.length !== 1) {
      throw new Error(
        'Usage limit migration aborted: expected exactly one Pro plan',
      );
    }

    const planId = plans[0].id;

    const features: Array<{ id: string }> =
      await queryRunner.query(`
        SELECT id
        FROM public.features
        WHERE slug = 'max_projects'
          AND value_type = 'number'
          AND is_active = true
      `);

    if (features.length !== 1) {
      throw new Error(
        'Usage limit migration aborted: max_projects feature unavailable',
      );
    }

    const featureId = features[0].id;

    const existingLimits: Array<{ value: string }> =
      await queryRunner.query(
        `
          SELECT value
          FROM public.plan_features
          WHERE plan_id = $1
            AND feature_id = $2
        `,
        [planId, featureId],
      );

    if (
      existingLimits.length > 0 &&
      existingLimits[0].value !== '10'
    ) {
      throw new Error(
        'Usage limit migration aborted: Pro already has a different max_projects value',
      );
    }

    await queryRunner.query(
      `
        INSERT INTO public.plan_features (
          plan_id,
          feature_id,
          value
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (plan_id, feature_id) DO NOTHING
      `,
      [planId, featureId, '10'],
    );
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Automatic rollback prevented: removing usage limits requires a reviewed reversal migration.',
    );
  }
}
