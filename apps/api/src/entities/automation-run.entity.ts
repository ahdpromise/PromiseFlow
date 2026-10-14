import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Automation } from './automation.entity';
import { Organization } from './organization.entity';

@Entity('automation_runs')
@Index('idx_automation_runs_automation', [
  'automation_id',
])
@Index('idx_automation_runs_organization', [
  'organization_id',
])
@Index('idx_automation_runs_started_at', [
  'started_at',
])
export class AutomationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  automation_id: string;

  @Column('uuid')
  organization_id: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  status: string;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  trigger_payload:
    | Record<string, unknown>
    | null;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  result:
    | Record<string, unknown>
    | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  error_message: string | null;

  @Column({
    type: 'timestamptz',
  })
  started_at: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  finished_at: Date | null;

  @ManyToOne(
    () => Automation,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({
    name: 'automation_id',
  })
  automation: Automation;

  @ManyToOne(
    () => Organization,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({
    name: 'organization_id',
  })
  organization: Organization;
}