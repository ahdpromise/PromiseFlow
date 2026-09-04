import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { WebhookDeliveriesService } from './webhook-deliveries.service';

@Controller('webhook-deliveries')
export class WebhookDeliveriesController {
  constructor(
    private readonly webhookDeliveriesService: WebhookDeliveriesService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      webhook_id: string;
      event: string;
      payload: string;
    },
  ) {
    return this.webhookDeliveriesService.create(
      body.webhook_id,
      body.event,
      body.payload,
    );
  }

  @Get('webhook/:webhookId')
  findByWebhookId(
    @Param('webhookId')
    webhookId: string,
  ) {
    return this.webhookDeliveriesService.findByWebhookId(
      webhookId,
    );
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
  ) {
    return this.webhookDeliveriesService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      response_status?: number | null;
      response_body?: string | null;
      delivered_at?: string | null;
      attempt?: number;
    },
  ) {
    return this.webhookDeliveriesService.updateStatus(
      id,
      {
        status: body.status,
        response_status:
          body.response_status ?? null,
        response_body:
          body.response_body ?? null,
        delivered_at:
          body.delivered_at
            ? new Date(body.delivered_at)
            : null,
        attempt:
          body.attempt,
      },
    );
  }
}