import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetPathToNotifications1789333287813
  implements MigrationInterface
{
  name =
    'AddTargetPathToNotifications1789333287813';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.notifications
      ADD COLUMN target_path text;
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.notifications
      DROP COLUMN IF EXISTS target_path;
    `);
  }
}