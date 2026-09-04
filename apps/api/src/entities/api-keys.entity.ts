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

@Entity('api_keys')
@Index(['key_hash'], { unique: true })
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
  })
  organization_id: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  key_prefix: string;

  @Column({
    type: 'text',
    select: false,
  })
  key_hash: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  last_used_at: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  expires_at: Date | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  revoked_at: Date | null;

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
}