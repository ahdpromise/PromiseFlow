import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestedByToApprovals1789330223679
  implements MigrationInterface
{
  name =
    'AddRequestedByToApprovals1789330223679';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.approvals
      ADD COLUMN requested_by_user_id uuid;
    `);

    await queryRunner.query(`
      UPDATE public.approvals
      SET requested_by_user_id =
        approver_user_id
      WHERE requested_by_user_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE public.approvals
      ALTER COLUMN requested_by_user_id
      SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE public.approvals
      ADD CONSTRAINT FK_approvals_requested_by_user
      FOREIGN KEY (
        requested_by_user_id
      )
      REFERENCES public.users(id)
      ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_approvals_requested_by_user_id
      ON public.approvals(
        requested_by_user_id
      );
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS
      public.IDX_approvals_requested_by_user_id;
    `);

    await queryRunner.query(`
      ALTER TABLE public.approvals
      DROP CONSTRAINT IF EXISTS
      FK_approvals_requested_by_user;
    `);

    await queryRunner.query(`
      ALTER TABLE public.approvals
      DROP COLUMN IF EXISTS
      requested_by_user_id;
    `);
  }
}