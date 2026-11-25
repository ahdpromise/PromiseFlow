import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class RevokeLegacyInvitationAcceptance1795500000000
  implements MigrationInterface
{
  name =
    'RevokeLegacyInvitationAcceptance1795500000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      REVOKE ALL
      ON FUNCTION public.accept_invitation(text)
      FROM PUBLIC, promiseflow_app;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF has_function_privilege(
          'promiseflow_app',
          'public.accept_invitation(text)',
          'EXECUTE'
        ) THEN
          RAISE EXCEPTION
            'Legacy invitation acceptance is still executable';
        END IF;

        IF NOT has_function_privilege(
          'promiseflow_app',
          'public.accept_invitation_with_details(text)',
          'EXECUTE'
        ) THEN
          RAISE EXCEPTION
            'Current invitation acceptance is not executable';
        END IF;
      END;
      $$;
    `);
  }

  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    throw new Error(
      'Automatic rollback prevented: restoring legacy invitation acceptance would reintroduce a security bypass.',
    );
  }
}