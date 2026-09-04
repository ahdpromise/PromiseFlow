import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Organization } from './organization.entity';
import { Plan } from './plans.entity';

@Entity('subscriptions')
@Index(['organization_id'], { unique: true })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
  })
  organization_id: string;

  @Column({
    type: 'uuid',
  })
  plan_id: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  status: string;

  @Column({
    type: 'timestamptz',
  })
  current_period_start: Date;

  @Column({
    type: 'timestamptz',
  })
  current_period_end: Date;

  @Column({
    type: 'boolean',
    default: false,
  })
  cancel_at_period_end: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  canceled_at: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @ManyToOne(() => Organization, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'organization_id',
  })
  organization: Organization;

  @ManyToOne(() => Plan, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'plan_id',
  })
  plan: Plan;
}