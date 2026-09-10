import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPermissions1789065988874
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO public.permissions (
        name,
        slug,
        description
      )
      VALUES
        ('View Projects', 'projects.read', 'View projects'),
        ('Create Projects', 'projects.create', 'Create projects'),
        ('Update Projects', 'projects.update', 'Update projects'),
        ('Delete Projects', 'projects.delete', 'Delete projects'),

        ('View Tasks', 'tasks.read', 'View tasks'),
        ('Create Tasks', 'tasks.create', 'Create tasks'),
        ('Update Tasks', 'tasks.update', 'Update tasks'),
        ('Delete Tasks', 'tasks.delete', 'Delete tasks'),

        ('View Teams', 'teams.read', 'View teams'),
        ('Create Teams', 'teams.create', 'Create teams'),
        ('Update Teams', 'teams.update', 'Update teams'),
        ('Delete Teams', 'teams.delete', 'Delete teams'),

        ('View Members', 'members.read', 'View organization members'),
        ('Manage Members', 'members.manage', 'Manage organization members'),

        ('View Roles', 'roles.read', 'View organization roles'),
        ('Manage Roles', 'roles.manage', 'Manage organization roles'),

        ('View Workflows', 'workflows.read', 'View workflows'),
        ('Create Workflows', 'workflows.create', 'Create workflows'),
        ('Update Workflows', 'workflows.update', 'Update workflows'),
        ('Delete Workflows', 'workflows.delete', 'Delete workflows')
      ON CONFLICT (slug) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM public.permissions
      WHERE slug IN (
        'projects.read',
        'projects.create',
        'projects.update',
        'projects.delete',
        'tasks.read',
        'tasks.create',
        'tasks.update',
        'tasks.delete',
        'teams.read',
        'teams.create',
        'teams.update',
        'teams.delete',
        'members.read',
        'members.manage',
        'roles.read',
        'roles.manage',
        'workflows.read',
        'workflows.create',
        'workflows.update',
        'workflows.delete'
      );
    `);
  }
}