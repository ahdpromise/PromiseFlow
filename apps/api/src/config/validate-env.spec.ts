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
  TRUSTED_PROXY_IP: '172.19.0.1',
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
    'TRUSTED_PROXY_IP',
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

describe('Production Demo environment validation', () => {
  const demoConfig = () => ({
    ...validProductionEnv(),
    DEMO_ENABLED: 'true',
    DEMO_USER_ID: '11111111-1111-4111-8111-111111111111',
    DEMO_ORGANIZATION_ID:
      '22222222-2222-4222-8222-222222222222',
  });

  it('allows production without demo configuration', () => {
    const config = validProductionEnv();

    expect(validateEnv(config)).toBe(config);
  });

  it('allows explicitly disabled demo mode', () => {
    const config = {
      ...validProductionEnv(),
      DEMO_ENABLED: 'false',
    };

    expect(validateEnv(config)).toBe(config);
  });

  it('allows enabled demo with valid UUIDs', () => {
    const config = demoConfig();

    expect(validateEnv(config)).toBe(config);
  });

  it.each([
    'DEMO_USER_ID',
    'DEMO_ORGANIZATION_ID',
  ] as const)('rejects missing %s', (key) => {
    const config: Record<string, unknown> = demoConfig();

    delete config[key];

    expect(() => validateEnv(config)).toThrow(
      `Production ${key} must be a valid UUID`,
    );
  });

  it.each([
    'DEMO_USER_ID',
    'DEMO_ORGANIZATION_ID',
  ] as const)('rejects invalid %s', (key) => {
    const config = {
      ...demoConfig(),
      [key]: 'invalid-uuid',
    };

    expect(() => validateEnv(config)).toThrow(
      `Production ${key} must be a valid UUID`,
    );
  });

  it.each([
    '',
    'yes',
    '1',
    'TRUE',
  ])('rejects invalid DEMO_ENABLED: %s', (value) => {
    const config = {
      ...validProductionEnv(),
      DEMO_ENABLED: value,
    };

    expect(() => validateEnv(config)).toThrow(
      'Production DEMO_ENABLED must be true or false',
    );
  });
});

describe('Production Trusted Proxy environment validation', () => {
  it.each([
    '172.19.0.1',
    '127.0.0.1',
    '10.0.0.1',
    '192.168.1.1',
  ])('allows a single IPv4 address: %s', (ip) => {
    const config = {
      ...validProductionEnv(),
      TRUSTED_PROXY_IP: ip,
    };

    expect(validateEnv(config)).toBe(config);
  });

  it.each([
    '',
    '   ',
  ])('rejects an empty TRUSTED_PROXY_IP: "%s"', (ip) => {
    const config = {
      ...validProductionEnv(),
      TRUSTED_PROXY_IP: ip,
    };

    expect(() => validateEnv(config)).toThrow(
      'Production environment variable TRUSTED_PROXY_IP is required',
    );
  });

  it.each([
    'true',
    'false',
    '*',
    '0.0.0.0',
    '255.255.255.255',
    '172.19.0.0/16',
    '172.19.0.1/32',
    '172.19.0.1,172.19.0.2',
    '172.19.0.1:3001',
    'localhost',
    'loopback',
    'linklocal',
    'uniquelocal',
    '256.19.0.1',
    '172.19.0',
    '::1',
    '::ffff:172.19.0.1',
  ])('rejects invalid TRUSTED_PROXY_IP: %s', (ip) => {
    const config = {
      ...validProductionEnv(),
      TRUSTED_PROXY_IP: ip,
    };

    expect(() => validateEnv(config)).toThrow(
      'Production TRUSTED_PROXY_IP must be a valid single IPv4 address',
    );
  });

  it('allows development without TRUSTED_PROXY_IP', () => {
    const config = {
      NODE_ENV: 'development',
    };

    expect(validateEnv(config)).toBe(config);
  });

  it('allows production with the current Hetzner configuration', () => {
    const config = {
      ...validProductionEnv(),
      FRONTEND_URL: 'https://promiseflow.duckdns.org',
      TRUSTED_PROXY_IP: '172.19.0.1',
    };

    expect(validateEnv(config)).toBe(config);
  });
});