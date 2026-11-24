import { describe, expect, it } from '@jest/globals';

import { validateEnv } from './validate-env';

const validProductionEnv = () => ({
  NODE_ENV: 'production',
  DATABASE_HOST: 'db.example.com',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'app_user',
  DATABASE_PASSWORD: 'test-password-not-real',
  DATABASE_NAME: 'app_db',
  JWT_SECRET: 'test-jwt-secret-not-real',
  RESEND_API_KEY: 'test-api-key-not-real',
  RESEND_FROM_EMAIL: 'noreply@example.com',
  FRONTEND_URL: 'https://app.example.com',
});

describe('validateEnv', () => {
  it('allows development without production variables', () => {
    const config = {
      NODE_ENV: 'development',
    };

    expect(validateEnv(config)).toBe(config);
  });

  it('allows a valid production configuration', () => {
    const config = validProductionEnv();

    expect(validateEnv(config)).toBe(config);
  });

  it.each([
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'JWT_SECRET',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'FRONTEND_URL',
  ])('rejects missing %s in production', (key) => {
    const config: Record<string, unknown> =
      validProductionEnv();

    delete config[key];

    expect(() => validateEnv(config)).toThrow(
      `Production environment variable ${key} is required`,
    );
  });

  it('rejects an empty required variable', () => {
    const config = {
      ...validProductionEnv(),
      JWT_SECRET: '   ',
    };

    expect(() => validateEnv(config)).toThrow(
      'Production environment variable JWT_SECRET is required',
    );
  });

  it.each([
    'http://app.example.com',
    'http://localhost:3000',
    'https://localhost:3000',
    'https://127.0.0.1:3000',
    'not-a-url',

    // Additional local hostname protection
    'https://[::1]:3000',
    'https://127.0.0.2:3000',
    'https://localhost.:3000',
    'https://0.0.0.0:3000',
    'https://127.255.255.254:3000',
    'https://app.localhost:3000',
    'https://LOCALHOST:3000',
    'https://[::]:3000',
    'https://[::ffff:127.0.0.1]:3000',
    'https://127.1:3000',
    'https://2130706433:3000',
  ])('rejects unsafe FRONTEND_URL: %s', (url) => {
    const config = {
      ...validProductionEnv(),
      FRONTEND_URL: url,
    };

    expect(() => validateEnv(config)).toThrow(
      /Production FRONTEND_URL/,
    );
  });

  it.each([
    'https://promiseflow.com',
    'https://app.promiseflow.com',
    'https://127.example.com',
  ])('allows safe FRONTEND_URL: %s', (url) => {
    const config = {
      ...validProductionEnv(),
      FRONTEND_URL: url,
    };

    expect(validateEnv(config)).toBe(config);
  });

  it('allows localhost in development', () => {
    const config = {
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3000',
    };

    expect(validateEnv(config)).toBe(config);
  });

  it.each([
    '0',
    '65536',
    'abc',
    '5432.5',
  ])('rejects invalid DATABASE_PORT: %s', (port) => {
    const config = {
      ...validProductionEnv(),
      DATABASE_PORT: port,
    };

    expect(() => validateEnv(config)).toThrow(
      'Production DATABASE_PORT must be a valid port',
    );
  });
});