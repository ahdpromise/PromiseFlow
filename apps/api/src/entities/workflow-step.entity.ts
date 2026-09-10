import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Workflow } from './workflow.entity';

@Entity('workflow_steps')
@Check(
  'CHK_workflow_steps_position_non_negative',
  `"position" >= 0`,
)
@Index(['workflow_id', 'slug'], { unique: true })
@Index(['workflow_id', 'position'])
export class WorkflowStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workflow_id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50 })
  step_type: string;

  @Column({ type: 'integer' })
  position: number;

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

  @ManyToOne(() => Workflow, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'workflow_id',
  })
  workflow: Workflow;
}