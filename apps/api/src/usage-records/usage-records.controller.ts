import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { UsageRecordsService } from './usage-records.service';

@Controller('usage-records')
export class UsageRecordsController {
  constructor(
    private readonly usageRecordsService: UsageRecordsService,
  ) {}

  @Get(':id')
  findById(
    @Param('id') id: string,
  ) {
    return this.usageRecordsService.findById(id);
  }

  @Get('organization/:organizationId')
  findByOrganizationId(
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.usageRecordsService.findByOrganizationId(
      organizationId,
    );
  }

  @Post()
  create(
    @Body()
    body: {
      organization_id: string;
      feature_id: string;
      usage: string;
      period_start: string;
      period_end: string;
    },
  ) {
    return this.usageRecordsService.create(
      body.organization_id,
      body.feature_id,
      body.usage,
      new Date(body.period_start),
      new Date(body.period_end),
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      usage?: string;
      period_start?: string;
      period_end?: string;
    },
  ) {
    return this.usageRecordsService.update(id, {
      ...(body.usage !== undefined && {
        usage: body.usage,
      }),
      ...(body.period_start !== undefined && {
        period_start: new Date(body.period_start),
      }),
      ...(body.period_end !== undefined && {
        period_end: new Date(body.period_end),
      }),
    });
  }
}