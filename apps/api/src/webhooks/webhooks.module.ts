import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Organization } from '../entities/organization.entity';
import { Webhook } from '../entities/webhooks.entity';

import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Webhook,
      Organization,
    ]),
  ],
  controllers: [
    WebhooksController,
  ],
  providers: [
    WebhooksService,
  ],
  exports: [
    WebhooksService,
  ],
})
export class WebhooksModule {}