import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { WebhookDeliveriesService } from './webhook-deliveries.service';

@Controller('webhook-deliveries')
@UseGuards(JwtAuthGuard)
export class WebhookDeliveriesController {
  constructor(
    private readonly webhookDeliveriesService: WebhookDeliveriesService,
  ) {}

  @Get('webhook/:webhookId')
  findByWebhookId(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('webhookId')
    webhookId: string,
  ) {
    return this.webhookDeliveriesService.findByWebhookId(
      user.userId,
      webhookId,
    );
  }

  @Get(':id')
  findById(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    id: string,
  ) {
    return this.webhookDeliveriesService.findById(
      user.userId,
      id,
    );
  }
}