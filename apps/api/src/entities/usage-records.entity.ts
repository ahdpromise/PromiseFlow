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
import { Feature } from './features.entity';

@Entity('usage_records')
@Check(
  'CHK_usage_records_usage_non_negative',
  `"usage" >= 0`,
)
@Check(
  'CHK_usage_records_period',
  `"period_end" > "period_start"`,
)
@Index(
  [
    'organization_id',
    'feature_id',
    'period_start',
    'period_end',
  ],
  {
    unique: true,
  },
)
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
  })
  organization_id: string;

  @Column({
    type: 'uuid',
  })
  feature_id: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  usage: string;

  @Column({
    type: 'timestamptz',
  })
  period_start: Date;

  @Column({
    type: 'timestamptz',
  })
  period_end: Date;

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

  @ManyToOne(() => Feature, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'feature_id',
  })
  feature: Feature;
}