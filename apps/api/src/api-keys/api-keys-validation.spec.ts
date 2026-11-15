
import { ValidationPipe } from '@nestjs/common';

import { CreateApiKeyDto } from './dto/create-api-key.dto';

describe('API Keys DTO runtime validation', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function validate(payload: unknown) {
    return validationPipe.transform(payload, {
      type: 'body',
      metatype: CreateApiKeyDto,
    });
  }

  const validPayload = {
    organization_id:
      '550e8400-e29b-41d4-a716-446655440000',
    name: 'Integration Key',
    expires_at: '2030-12-31T23:59:59Z',
  };

  it('accepts valid API key creation data', async () => {
    const result = await validate(validPayload);

    expect(result).toBeInstanceOf(CreateApiKeyDto);
    expect(result).toMatchObject(validPayload);
  });

  it('accepts missing expiration date', async () => {
    const { expires_at, ...payload } = validPayload;

    const result = await validate(payload);

    expect(result).toBeInstanceOf(CreateApiKeyDto);
    expect(result).toMatchObject(payload);
    expect(
      (result as CreateApiKeyDto).expires_at,
    ).toBeUndefined();
  });

  it('accepts null expiration date', async () => {
    const result = await validate({
      ...validPayload,
      expires_at: null,
    });

    expect(result).toHaveProperty(
      'expires_at',
      null,
    );
  });

  it('rejects an invalid organization UUID', async () => {
    await expect(
      validate({
        ...validPayload,
        organization_id: 'invalid-uuid',
      }),
    ).rejects.toThrow();
  });

  it('rejects empty API key names', async () => {
    await expect(
      validate({
        ...validPayload,
        name: '',
      }),
    ).rejects.toThrow();
  });

  it('rejects names longer than 100 characters', async () => {
    await expect(
      validate({
        ...validPayload,
        name: 'a'.repeat(101),
      }),
    ).rejects.toThrow();
  });

  it('rejects invalid expiration dates', async () => {
    await expect(
      validate({
        ...validPayload,
        expires_at: 'invalid-date',
      }),
    ).rejects.toThrow();
  });

  it('rejects expiration dates with invalid calendar values', async () => {
    await expect(
      validate({
        ...validPayload,
        expires_at: '2030-02-30T12:00:00Z',
      }),
    ).rejects.toThrow();
  });

  it('rejects unexpected sensitive fields', async () => {
    await expect(
      validate({
        ...validPayload,
        key_hash: 'attacker-controlled-hash',
        revoked_at: null,
      }),
    ).rejects.toThrow();
  });

  it('rejects non-string expiration dates', async () => {
    await expect(
      validate({
        ...validPayload,
        expires_at: 123456789,
      }),
    ).rejects.toThrow();
  });
});
