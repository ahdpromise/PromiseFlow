import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { Webhook } from '../entities/webhooks.entity';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(Webhook)
    private readonly webhooksRepository: Repository<Webhook>,

    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  async create(
    organizationId: string,
    name: string,
    url: string,
    events: string,
  ) {
    const organization =
      await this.organizationsRepository.findOne({
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
      await this.webhooksRepository.findOne({
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
      this.webhooksRepository.create({
        organization_id: organizationId,
        name,
        url,
        secret,
        events,
        is_active: true,
      });

    const savedWebhook =
      await this.webhooksRepository.save(webhook);

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
  }

  async findByOrganizationId(
    organizationId: string,
  ) {
    return this.webhooksRepository.find({
      where: {
        organization_id: organizationId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findById(id: string) {
    const webhook =
      await this.webhooksRepository.findOne({
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
  }

  async update(
    id: string,
    data: {
      name?: string;
      url?: string;
      events?: string;
      is_active?: boolean;
    },
  ) {
    const webhook =
      await this.findById(id);

    if (
      data.name !== undefined &&
      data.name !== webhook.name
    ) {
      const existingWebhook =
        await this.webhooksRepository.findOne({
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

    return this.webhooksRepository.save(
      webhook,
    );
  }

  async deactivate(id: string) {
    const webhook =
      await this.findById(id);

    if (!webhook.is_active) {
      throw new ConflictException(
        'Webhook is already inactive',
      );
    }

    webhook.is_active = false;

    return this.webhooksRepository.save(
      webhook,
    );
  }
}