import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Feature } from '../entities/features.entity';
import { Organization } from '../entities/organization.entity';
import { UsageRecord } from '../entities/usage-records.entity';

import { UsageRecordsController } from './usage-records.controller';
import { UsageRecordsService } from './usage-records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsageRecord,
      Organization,
      Feature,
    ]),
  ],
  controllers: [
    UsageRecordsController,
  ],
  providers: [
    UsageRecordsService,
  ],
  exports: [
    UsageRecordsService,
  ],
})
export class UsageRecordsModule {}