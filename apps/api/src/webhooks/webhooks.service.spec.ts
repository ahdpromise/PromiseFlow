
import { jest } from '@jest/globals';

import { RlsContextService } from '../database/rls-context.service';
import { Webhook } from '../entities/webhooks.entity';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService security', () => {
  let service: WebhooksService;

  const originalWebhook = {
    id: 'webhook-id',
    organization_id: 'organization-id',
    name: 'Original webhook',
    url: 'https://example.com/webhook',
    events: 'task.created',
    is_active: true,
    secret: 'original-secret',
  };

  const webhooksRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const manager = {
    getRepository: jest.fn(),
  };

  const rlsContextService = {
    run: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    webhooksRepository.findOne.mockImplementation(
      async () => ({ ...originalWebhook }),
    );

    webhooksRepository.save.mockImplementation(
      async (entity: unknown) => entity,
    );

    manager.getRepository.mockImplementation(
      (entity: unknown) => {
        if (entity === Webhook) {
          return webhooksRepository;
        }

        throw new Error('Unexpected repository');
      },
    );

    rlsContextService.run.mockImplementation(
      async (
        _userId: unknown,
        callback: unknown,
      ) => {
        return (
          callback as (
            entityManager: typeof manager,
          ) => Promise<unknown>
        )(manager);
      },
    );

    service = new WebhooksService(
      rlsContextService as unknown as RlsContextService,
    );
  });

  it('allows updating supported webhook fields', async () => {
    const result = await service.update(
      'user-id',
      'webhook-id',
      {
        url: 'https://example.com/updated',
        is_active: false,
      },
    );

    expect(result).toMatchObject({
      id: 'webhook-id',
      organization_id: 'organization-id',
      url: 'https://example.com/updated',
      is_active: false,
      secret: 'original-secret',
    });

    expect(
      webhooksRepository.save,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not allow mass assignment of protected fields', async () => {
    const maliciousPayload = {
      url: 'https://example.com/updated',
      organization_id: 'another-organization',
      secret: 'attacker-secret',
      id: 'another-webhook-id',
      created_at: new Date('2030-01-01'),
    };

    const result = await service.update(
      'user-id',
      'webhook-id',
      maliciousPayload as {
        url?: string;
      },
    );

    expect(result).toMatchObject({
      id: 'webhook-id',
      organization_id: 'organization-id',
      secret: 'original-secret',
      url: 'https://example.com/updated',
    });

    expect(result).not.toHaveProperty(
      'created_at',
    );

    expect(
      webhooksRepository.save,
    ).toHaveBeenCalledTimes(1);
  });
});
