import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class AddMetadataToNotifications1789464833471
  implements MigrationInterface
{
  name =
    'AddMetadataToNotifications1789464833471';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.notifications
      ADD COLUMN metadata jsonb
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.notifications
      DROP COLUMN metadata
    `);
  }
}