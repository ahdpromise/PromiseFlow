import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';

import { PlanFeaturesService } from './plan-features.service';

@Controller('plans/:planId/features')
export class PlanFeaturesController {
  constructor(
    private readonly planFeaturesService: PlanFeaturesService,
  ) {}

  @Get()
  findAll(
    @Param('planId') planId: string,
  ) {
    return this.planFeaturesService.findAllByPlan(
      planId,
    );
  }

  @Get(':featureId')
  findOne(
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
  ) {
    return this.planFeaturesService.findOne(
      planId,
      featureId,
    );
  }
}