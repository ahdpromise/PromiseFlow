import { describe, it, beforeAll, afterAll } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    if (process.env.DATABASE_NAME !== 'promiseflow_test') {
      throw new Error(
        'E2E SAFETY CHECK FAILED: DATABASE_NAME must be promiseflow_test.',
      );
    }

    const { AppModule } = await import('../src/app.module.js');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const dataSource = moduleFixture.get<DataSource>(getDataSourceToken());

    const result: Array<{ database_name: string; database_user: string }> =
      await dataSource.query(`
        SELECT
          current_database() AS database_name,
          current_user AS database_user
      `);

    if (
      result.length !== 1 ||
      result[0].database_name !== 'promiseflow_test' ||
      result[0].database_user !== 'promiseflow_app'
    ) {
      await dataSource.destroy();

      throw new Error(
        'E2E SAFETY CHECK FAILED: Unexpected database connection.',
      );
    }

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  it('/ (GET)', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 10000);
});