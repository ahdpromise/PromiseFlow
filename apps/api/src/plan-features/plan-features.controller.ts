import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

  @Post()
  create(
    @Param('planId') planId: string,
    @Body()
    body: {
      feature_id: string;
      value: string;
    },
  ) {
    return this.planFeaturesService.create(
      planId,
      body.feature_id,
      body.value,
    );
  }

  @Patch(':featureId')
  updateValue(
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
    @Body()
    body: {
      value: string;
    },
  ) {
    return this.planFeaturesService.updateValue(
      planId,
      featureId,
      body.value,
    );
  }

  @Delete(':featureId')
  remove(
    @Param('planId') planId: string,
    @Param('featureId') featureId: string,
  ) {
    return this.planFeaturesService.remove(
      planId,
      featureId,
    );
  }
}