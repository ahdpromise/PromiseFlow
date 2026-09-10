import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Workflow } from './workflow.entity';
import { WorkflowStep } from './workflow-step.entity';

@Entity('workflow_transitions')
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

  @ManyToOne(() => Workflow, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'workflow_id',
  })
  workflow: Workflow;

  @ManyToOne(() => WorkflowStep, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'from_step_id',
  })
  from_step: WorkflowStep;

  @ManyToOne(() => WorkflowStep, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'to_step_id',
  })
  to_step: WorkflowStep;
}