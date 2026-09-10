import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { UsageRecordsService } from './usage-records.service';

@Controller('usage-records')
@UseGuards(JwtAuthGuard)
export class UsageRecordsController {
  constructor(
    private readonly usageRecordsService: UsageRecordsService,
  ) {}

  @Get('organization/:organizationId')
  findByOrganizationId(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.usageRecordsService.findByOrganizationId(
      user.userId,
      organizationId,
    );
  }

  @Get(':id')
  findById(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    id: string,
  ) {
    return this.usageRecordsService.findById(
      user.userId,
      id,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
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
      user.userId,
      body.organization_id,
      body.feature_id,
      body.usage,
      new Date(body.period_start),
      new Date(body.period_end),
    );
  }

  @Patch(':id')
  update(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    id: string,
    @Body()
    body: {
      usage?: string;
      period_start?: string;
      period_end?: string;
    },
  ) {
    return this.usageRecordsService.update(
      user.userId,
      id,
      {
        ...(body.usage !== undefined && {
          usage: body.usage,
        }),
        ...(body.period_start !== undefined && {
          period_start: new Date(body.period_start),
        }),
        ...(body.period_end !== undefined && {
          period_end: new Date(body.period_end),
        }),
      },
    );
  }
}