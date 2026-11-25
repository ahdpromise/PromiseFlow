import { isIP } from 'node:net';

type Environment = Record<string, unknown>;

const requiredProductionVariables = [
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
] as const;

function isLocalHostname(hostname: string): boolean {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');

  return (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost') ||
    (normalizedHostname.startsWith('127.') &&
      /^\d+\.\d+\.\d+\.\d+$/.test(normalizedHostname)) ||
    normalizedHostname === '0.0.0.0' ||
    normalizedHostname === '::1' ||
    normalizedHostname === '::' ||
    normalizedHostname.startsWith('::ffff:')
  );
}

function isValidUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.trim(),
    )
  );
}

export function validateEnv(
  config: Environment,
): Environment {
  if (config.NODE_ENV !== 'production') {
    return config;
  }

  for (const key of requiredProductionVariables) {
    const value = config[key];

    if (
      typeof value !== 'string' ||
      value.trim().length === 0
    ) {
      throw new Error(
        `Production environment variable ${key} is required`,
      );
    }
  }

  const frontendUrl = String(config.FRONTEND_URL);

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(frontendUrl);
  } catch {
    throw new Error(
      'Production FRONTEND_URL must be a valid URL',
    );
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    isLocalHostname(parsedUrl.hostname)
  ) {
    throw new Error(
      'Production FRONTEND_URL must use HTTPS and a non-local hostname',
    );
  }

  const databasePort = Number(config.DATABASE_PORT);

  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65535
  ) {
    throw new Error(
      'Production DATABASE_PORT must be a valid port',
    );
  }

  const trustedProxyIp = String(
    config.TRUSTED_PROXY_IP,
  ).trim();

  if (
    isIP(trustedProxyIp) !== 4 ||
    trustedProxyIp === '0.0.0.0' ||
    trustedProxyIp === '255.255.255.255'
  ) {
    throw new Error(
      'Production TRUSTED_PROXY_IP must be a valid single IPv4 address',
    );
  }

  const demoEnabled = config.DEMO_ENABLED;

  if (
    demoEnabled !== undefined &&
    demoEnabled !== 'true' &&
    demoEnabled !== 'false'
  ) {
    throw new Error(
      'Production DEMO_ENABLED must be true or false',
    );
  }

  if (demoEnabled === 'true') {
    for (const key of [
      'DEMO_USER_ID',
      'DEMO_ORGANIZATION_ID',
    ] as const) {
      if (!isValidUuid(config[key])) {
        throw new Error(
          `Production ${key} must be a valid UUID when DEMO_ENABLED=true`,
        );
      }
    }
  }

  return config;
}