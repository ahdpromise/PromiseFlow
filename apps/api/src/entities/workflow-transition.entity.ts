import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('workflow_transitions')
@Index(['workflow_id'])
@Index(['workflow_id', 'slug'], { unique: true })
@Index(['from_step_id'])
@Index(['to_step_id'])
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflow_id: string;

  @Column({ type: 'uuid' })
  from_step_id: string;

  @Column({ type: 'uuid' })
  to_step_id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  condition: string | null;

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
