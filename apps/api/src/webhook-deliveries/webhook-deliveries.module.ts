import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Webhook } from '../entities/webhooks.entity';
import { WebhookDelivery } from '../entities/webhook-deliveries.entity';

import { WebhookDeliveriesController } from './webhook-deliveries.controller';
import { WebhookDeliveriesService } from './webhook-deliveries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebhookDelivery,
      Webhook,
    ]),
  ],
  controllers: [
    WebhookDeliveriesController,
  ],
  providers: [
    WebhookDeliveriesService,
  ],
  exports: [
    WebhookDeliveriesService,
  ],
})
export class WebhookDeliveriesModule {}