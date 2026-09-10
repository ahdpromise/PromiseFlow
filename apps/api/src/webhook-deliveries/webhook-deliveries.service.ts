import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { WebhookDelivery } from '../entities/webhook-deliveries.entity';
import { Webhook } from '../entities/webhooks.entity';

@Injectable()
export class WebhookDeliveriesService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async create(
    currentUserId: string,
    webhookId: string,
    event: string,
    payload: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const webhooksRepository =
          manager.getRepository(Webhook);

        const deliveriesRepository =
          manager.getRepository(WebhookDelivery);

        const webhook =
          await webhooksRepository.findOne({
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
          deliveriesRepository.create({
            webhook_id: webhookId,
            event,
            payload,
            status: 'pending',
            attempt: 1,
            response_status: null,
            response_body: null,
            delivered_at: null,
          });

        return deliveriesRepository.save(
          delivery,
        );
      },
    );
  }

  async findByWebhookId(
    currentUserId: string,
    webhookId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const webhooksRepository =
          manager.getRepository(Webhook);

        const deliveriesRepository =
          manager.getRepository(WebhookDelivery);

        const webhook =
          await webhooksRepository.findOne({
            where: {
              id: webhookId,
            },
          });

        if (!webhook) {
          throw new NotFoundException(
            'Webhook not found',
          );
        }

        return deliveriesRepository.find({
          where: {
            webhook_id: webhookId,
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }

  async findById(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const deliveriesRepository =
          manager.getRepository(WebhookDelivery);

        const delivery =
          await deliveriesRepository.findOne({
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
      },
    );
  }

  async updateStatus(
    currentUserId: string,
    id: string,
    data: {
      status: string;
      response_status?: number | null;
      response_body?: string | null;
      delivered_at?: Date | null;
      attempt?: number;
    },
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const deliveriesRepository =
          manager.getRepository(WebhookDelivery);

        const delivery =
          await deliveriesRepository.findOne({
            where: {
              id,
            },
          });

        if (!delivery) {
          throw new NotFoundException(
            'Webhook delivery not found',
          );
        }

        Object.assign(delivery, data);

        return deliveriesRepository.save(
          delivery,
        );
      },
    );
  }
}