import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { FeaturesService } from './features.service';

@Controller('features')
export class FeaturesController {
  constructor(
    private readonly featuresService: FeaturesService,
  ) {}

  @Get()
  findAll() {
    return this.featuresService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      slug: string;
      description?: string | null;
      value_type: string;
    },
  ) {
    return this.featuresService.create(
      body.name,
      body.slug,
      body.description ?? null,
      body.value_type,
    );
  }
}