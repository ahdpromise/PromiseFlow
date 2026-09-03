import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('invitations')
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
}