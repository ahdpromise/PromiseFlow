
import { ValidationPipe } from '@nestjs/common';

import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

describe('Webhooks DTO runtime validation', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function validateDto(
    metatype: new () => object,
    payload: unknown,
  ) {
    return validationPipe.transform(payload, {
      type: 'body',
      metatype,
    });
  }

  const validCreatePayload = {
    organization_id:
      '550e8400-e29b-41d4-a716-446655440000',
    name: 'Task webhook',
    url: 'https://example.com/webhook',
    events: 'task.created',
  };

  it('accepts valid webhook creation data', async () => {
    const result = await validateDto(
      CreateWebhookDto,
      validCreatePayload,
    );

    expect(result).toMatchObject(
      validCreatePayload,
    );

    expect(result).toBeInstanceOf(
      CreateWebhookDto,
    );
  });

  it('rejects an invalid organization UUID', async () => {
    await expect(
      validateDto(CreateWebhookDto, {
        ...validCreatePayload,
        organization_id: 'invalid-id',
      }),
    ).rejects.toThrow();
  });

  it('rejects missing required creation fields', async () => {
    await expect(
      validateDto(CreateWebhookDto, {
        organization_id:
          validCreatePayload.organization_id,
      }),
    ).rejects.toThrow();
  });

  it('rejects additional fields during creation', async () => {
    await expect(
      validateDto(CreateWebhookDto, {
        ...validCreatePayload,
        secret: 'attacker-secret',
      }),
    ).rejects.toThrow();
  });

  it('accepts valid partial updates', async () => {
    const result = await validateDto(
      UpdateWebhookDto,
      {
        url: 'https://example.com/updated',
        is_active: false,
      },
    );

    expect(result).toMatchObject({
      url: 'https://example.com/updated',
      is_active: false,
    });
  });

  it('rejects string values for is_active', async () => {
    await expect(
      validateDto(UpdateWebhookDto, {
        is_active: 'false',
      }),
    ).rejects.toThrow();
  });

  it('rejects protected fields during updates', async () => {
    await expect(
      validateDto(UpdateWebhookDto, {
        organization_id:
          '550e8400-e29b-41d4-a716-446655440001',
        secret: 'attacker-secret',
      }),
    ).rejects.toThrow();
  });

  it('rejects empty names during updates', async () => {
    await expect(
      validateDto(UpdateWebhookDto, {
        name: '',
      }),
    ).rejects.toThrow();
  });

  it('rejects names longer than 100 characters', async () => {
    await expect(
      validateDto(UpdateWebhookDto, {
        name: 'a'.repeat(101),
      }),
    ).rejects.toThrow();
  });
});
