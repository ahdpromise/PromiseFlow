import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('automations')
@Index(['organization_id'])
@Index(['organization_id', 'is_enabled'])
export class Automation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 100,
  })
  trigger_type: string;

  @Column({
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  trigger_config: Record<string, unknown>;

  @Column({
    type: 'varchar',
    length: 100,
  })
  action_type: string;

  @Column({
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  action_config: Record<string, unknown>;

  @Column({
    type: 'boolean',
    default: true,
  })
  is_enabled: boolean;

  @Column({ type: 'uuid' })
  created_by: string;

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

  @ManyToOne(() => Organization, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'organization_id',
  })
  organization: Organization;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'created_by',
  })
  creator: User;
}