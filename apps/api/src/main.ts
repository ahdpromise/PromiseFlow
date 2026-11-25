import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { DatabaseExceptionFilter } from './common/filters/database-exception.filter';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  if (process.env.NODE_ENV === 'production') {
    const trustedProxyIp =
      process.env.TRUSTED_PROXY_IP!.trim();

    app.set('trust proxy', trustedProxyIp);
  }

  const frontendUrl =
    process.env.FRONTEND_URL?.trim() ||
    'http://localhost:3000';

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(
    new DatabaseExceptionFilter(),
  );

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();