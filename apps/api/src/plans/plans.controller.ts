import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
  ) {}

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      slug: string;
      description?: string | null;
      price: string;
      currency: string;
      billing_interval: string;
    },
  ) {
    return this.plansService.create(
      body.name,
      body.slug,
      body.description ?? null,
      body.price,
      body.currency,
      body.billing_interval,
    );
  }
}