
import 'reflect-metadata';
import 'dotenv/config';

import { join } from 'node:path';

import { DataSource } from 'typeorm';
import { getPostgresConnectionOptions } from './postgres-connection.options';

const isCompiled = __filename.endsWith('.js');

const fileExtension = isCompiled ? 'js' : 'ts';

export default new DataSource({
  ...getPostgresConnectionOptions(),

  entities: [
    join(
      __dirname,
      '..',
      'entities',
      `**/*.entity.${fileExtension}`,
    ),
  ],

  migrations: [
    join(
      __dirname,
      'migrations',
      `*.${fileExtension}`,
    ),
  ],

  synchronize: false,
});
