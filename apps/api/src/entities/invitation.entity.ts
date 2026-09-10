import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Organization } from './organization.entity';
import { Role } from './roles.entity';

@Entity('invitations')
@Check(
  'CHK_invitations_expiry_after_creation',
  `"expires_at" > "created_at"`,
)
@Check(
  'CHK_invitations_accepted_after_creation',
  `"accepted_at" >= "created_at"`,
)
@Index(['organization_id', 'email'])
@Index(['token'], { unique: true })
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'citext' })
  email: string;

  @Column({ type: 'uuid' })
  role_id: string;

  @Column({ type: 'text' })
  token: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  accepted_at: Date | null;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

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

  @ManyToOne(() => Role, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role: Role;
}