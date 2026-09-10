import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Webhook } from './webhooks.entity';

@Entity('webhook_deliveries')
@Check(
  'CHK_webhook_deliveries_status',
  `"status" IN ('pending', 'success', 'failed')`,
)
@Check(
  'CHK_webhook_deliveries_attempt_positive',
  `"attempt" >= 1`,
)
@Check(
  'CHK_webhook_deliveries_response_status',
  `"response_status" BETWEEN 100 AND 599`,
)
@Index(['webhook_id', 'created_at'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
  })
  webhook_id: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  event: string;

  @Column({
    type: 'text',
  })
  payload: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  status: string;

  @Column({
    type: 'integer',
    default: 1,
  })
  attempt: number;

  @Column({
    type: 'integer',
    nullable: true,
  })
  response_status: number | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  response_body: string | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  delivered_at: Date | null;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @ManyToOne(() => Webhook, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'webhook_id',
  })
  webhook: Webhook;
}