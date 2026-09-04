import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WebhookDelivery } from '../entities/webhook-deliveries.entity';
import { Webhook } from '../entities/webhooks.entity';

@Injectable()
export class WebhookDeliveriesService {
  constructor(
    @InjectRepository(WebhookDelivery)
    private readonly deliveriesRepository: Repository<WebhookDelivery>,

    @InjectRepository(Webhook)
    private readonly webhooksRepository: Repository<Webhook>,
  ) {}

  async create(
    webhookId: string,
    event: string,
    payload: string,
  ) {
    const webhook =
      await this.webhooksRepository.findOne({
        where: {
          id: webhookId,
        },
      });

    if (!webhook) {
      throw new NotFoundException(
        'Webhook not found',
      );
    }

    if (!webhook.is_active) {
      throw new ConflictException(
        'Webhook is inactive',
      );
    }

    const delivery =
      this.deliveriesRepository.create({
        webhook_id: webhookId,
        event,
        payload,
        status: 'pending',
        attempt: 1,
        response_status: null,
        response_body: null,
        delivered_at: null,
      });

    return this.deliveriesRepository.save(
      delivery,
    );
  }

  async findByWebhookId(
    webhookId: string,
  ) {
    const webhook =
      await this.webhooksRepository.findOne({
        where: {
          id: webhookId,
        },
      });

    if (!webhook) {
      throw new NotFoundException(
        'Webhook not found',
      );
    }

    return this.deliveriesRepository.find({
      where: {
        webhook_id: webhookId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findById(id: string) {
    const delivery =
      await this.deliveriesRepository.findOne({
        where: {
          id,
        },
      });

    if (!delivery) {
      throw new NotFoundException(
        'Webhook delivery not found',
      );
    }

    return delivery;
  }

  async updateStatus(
    id: string,
    data: {
      status: string;
      response_status?: number | null;
      response_body?: string | null;
      delivered_at?: Date | null;
      attempt?: number;
    },
  ) {
    const delivery =
      await this.findById(id);

    Object.assign(delivery, data);

    return this.deliveriesRepository.save(
      delivery,
    );
  }
}