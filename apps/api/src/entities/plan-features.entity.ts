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

import { Plan } from './plans.entity';
import { Feature } from './features.entity';

@Entity('plan_features')
@Index(['plan_id', 'feature_id'], { unique: true })
export class PlanFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
  })
  plan_id: string;

  @Column({
    type: 'uuid',
  })
  feature_id: string;

  @Column({
    type: 'text',
  })
  value: string;

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

  @ManyToOne(() => Plan, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'plan_id',
  })
  plan: Plan;

  @ManyToOne(() => Feature, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'feature_id',
  })
  feature: Feature;
}