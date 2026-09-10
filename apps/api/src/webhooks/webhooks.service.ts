import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import { RlsContextService } from '../database/rls-context.service';
import { Organization } from '../entities/organization.entity';
import { Webhook } from '../entities/webhooks.entity';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async create(
    currentUserId: string,
    organizationId: string,
    name: string,
    url: string,
    events: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const organizationsRepository =
          manager.getRepository(Organization);

        const webhooksRepository =
          manager.getRepository(Webhook);

        const organization =
          await organizationsRepository.findOne({
            where: {
              id: organizationId,
            },
          });

        if (!organization) {
          throw new NotFoundException(
            'Organization not found',
          );
        }

        const existingWebhook =
          await webhooksRepository.findOne({
            where: {
              organization_id: organizationId,
              name,
            },
          });

        if (existingWebhook) {
          throw new ConflictException(
            'A webhook with this name already exists for this organization',
          );
        }

        const secret = `whsec_${randomBytes(32).toString('hex')}`;

        const webhook =
          webhooksRepository.create({
            organization_id: organizationId,
            name,
            url,
            secret,
            events,
            is_active: true,
          });

        const savedWebhook =
          await webhooksRepository.save(webhook);

        return {
          id: savedWebhook.id,
          organization_id:
            savedWebhook.organization_id,
          name: savedWebhook.name,
          url: savedWebhook.url,
          events: savedWebhook.events,
          is_active: savedWebhook.is_active,
          secret,
          created_at:
            savedWebhook.created_at,
          updated_at:
            savedWebhook.updated_at,
        };
      },
    );
  }

  async findByOrganizationId(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const webhooksRepository =
          manager.getRepository(Webhook);

        return webhooksRepository.find({
          where: {
            organization_id: organizationId,
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
        const webhooksRepository =
          manager.getRepository(Webhook);

        const webhook =
          await webhooksRepository.findOne({
            where: {
              id,
            },
          });

        if (!webhook) {
          throw new NotFoundException(
            'Webhook not found',
          );
        }

        return webhook;
      },
    );
  }

  async update(
    currentUserId: string,
    id: string,
    data: {
      name?: string;
      url?: string;
      events?: string;
      is_active?: boolean;
    },
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const webhooksRepository =
          manager.getRepository(Webhook);

        const webhook =
          await webhooksRepository.findOne({
            where: {
              id,
            },
          });

        if (!webhook) {
          throw new NotFoundException(
            'Webhook not found',
          );
        }

        if (
          data.name !== undefined &&
          data.name !== webhook.name
        ) {
          const existingWebhook =
            await webhooksRepository.findOne({
              where: {
                organization_id:
                  webhook.organization_id,
                name: data.name,
              },
            });

          if (existingWebhook) {
            throw new ConflictException(
              'A webhook with this name already exists for this organization',
            );
          }
        }

        Object.assign(webhook, data);

        return webhooksRepository.save(
          webhook,
        );
      },
    );
  }

  async deactivate(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const webhooksRepository =
          manager.getRepository(Webhook);

        const webhook =
          await webhooksRepository.findOne({
            where: {
              id,
            },
          });

        if (!webhook) {
          throw new NotFoundException(
            'Webhook not found',
          );
        }

        if (!webhook.is_active) {
          throw new ConflictException(
            'Webhook is already inactive',
          );
        }

        webhook.is_active = false;

        return webhooksRepository.save(
          webhook,
        );
      },
    );
  }
}