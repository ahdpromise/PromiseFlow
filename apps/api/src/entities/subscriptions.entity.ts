import {
  Check,
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
@Check(
  'CHK_subscriptions_status',
  `"status" IN ('active', 'trialing', 'past_due', 'canceled')`,
)
@Check(
  'CHK_subscriptions_period',
  `"current_period_end" > "current_period_start"`,
)
@Check(
  'CHK_subscriptions_canceled_after_creation',
  `"canceled_at" >= "created_at"`,
)
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