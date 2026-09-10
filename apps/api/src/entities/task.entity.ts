import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Project } from './project.entity';
import { User } from './user.entity';
import { WorkflowStep } from './workflow-step.entity';

@Entity('tasks')
@Check(
  'CHK_tasks_status',
  `"status" IN ('pending', 'in_progress', 'completed', 'canceled')`,
)
@Check(
  'CHK_tasks_priority',
  `"priority" IN ('low', 'medium', 'high', 'urgent')`,
)
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

  @ManyToOne(() => Project, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'project_id',
  })
  project: Project;

  @ManyToOne(() => WorkflowStep, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'workflow_step_id',
  })
  workflow_step: WorkflowStep | null;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'assigned_to_user_id',
  })
  assigned_to_user: User | null;
}