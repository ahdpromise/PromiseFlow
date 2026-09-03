import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('tasks')
@Index(['project_id'])
@Index(['workflow_step_id'])
@Index(['assigned_to_user_id'])
@Index(['project_id', 'status'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  workflow_step_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  assigned_to_user_id: string | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'medium',
  })
  priority: string;

  @Column({ type: 'timestamptz', nullable: true })
  due_at: Date | null;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  deleted_at: Date | null;
}