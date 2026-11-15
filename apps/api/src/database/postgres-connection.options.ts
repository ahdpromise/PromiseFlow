
import { readFileSync } from 'node:fs';
import type { DataSourceOptions } from 'typeorm';

type DatabaseEnvironment = NodeJS.ProcessEnv;

type PostgresOptions = Extract<
  DataSourceOptions,
  { type: 'postgres' }
>;

export function getPostgresConnectionOptions(
  env: DatabaseEnvironment = process.env,
): Pick<
  PostgresOptions,
  | 'type'
  | 'host'
  | 'port'
  | 'username'
  | 'password'
  | 'database'
  | 'ssl'
> {
  const isProduction = env.NODE_ENV === 'production';

  const caFile = env.DATABASE_SSL_CA_FILE?.trim();

  if (isProduction && !caFile) {
    throw new Error(
      'Production DATABASE_SSL_CA_FILE is required',
    );
  }

  return {
    type: 'postgres',
    host: env.DATABASE_HOST,
    port: Number(env.DATABASE_PORT),
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,

    ssl: isProduction
      ? {
          rejectUnauthorized: true,
          ca: readFileSync(caFile!, 'utf8'),
        }
      : false,
  };
}
