import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiKey } from '../entities/api-keys.entity';
import { Organization } from '../entities/organization.entity';

import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ApiKey,
      Organization,
    ]),
  ],
  controllers: [
    ApiKeysController,
  ],
  providers: [
    ApiKeysService,
  ],
  exports: [
    ApiKeysService,
  ],
})
export class ApiKeysModule {}