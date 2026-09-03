import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlanFeature } from '../entities/plan-features.entity';
import { PlanFeaturesController } from './plan-features.controller';
import { PlanFeaturesService } from './plan-features.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlanFeature]),
  ],
  controllers: [
    PlanFeaturesController,
  ],
  providers: [
    PlanFeaturesService,
  ],
  exports: [
    PlanFeaturesService,
  ],
})
export class PlanFeaturesModule {}