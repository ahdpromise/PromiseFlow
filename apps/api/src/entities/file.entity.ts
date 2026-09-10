import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Task } from './task.entity';
import { User } from './user.entity';

@Entity('files')
@Check(
  'CHK_files_file_size_non_negative',
  `"file_size" >= 0`,
)
@Index(['task_id'])
@Index(['uploaded_by_user_id'])
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  task_id: string;

  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 255 })
  storage_key: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

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

  @ManyToOne(() => Task, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'task_id',
  })
  task: Task;

  @ManyToOne(() => User, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'uploaded_by_user_id',
  })
  uploaded_by_user: User;
}