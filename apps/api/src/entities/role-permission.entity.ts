import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Permission } from './permission.entity';
import { Role } from './roles.entity';

@Entity('role_permissions')
@Index(['role_id', 'permission_id'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  role_id: string;

  @Column({ type: 'uuid' })
  permission_id: string;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @ManyToOne(() => Role, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role: Role;

  @ManyToOne(() => Permission, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'permission_id',
  })
  permission: Permission;
}