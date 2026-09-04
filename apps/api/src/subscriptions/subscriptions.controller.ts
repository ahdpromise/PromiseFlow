import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get(':id')
  findById(
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.findById(id);
  }

  @Get('organization/:organizationId')
  findByOrganizationId(
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.subscriptionsService.findByOrganizationId(
      organizationId,
    );
  }

  @Post()
  create(
    @Body()
    body: {
      organization_id: string;
      plan_id: string;
      status: string;
      current_period_start: string;
      current_period_end: string;
      cancel_at_period_end?: boolean;
    },
  ) {
    return this.subscriptionsService.create(
      body.organization_id,
      body.plan_id,
      body.status,
      new Date(body.current_period_start),
      new Date(body.current_period_end),
      body.cancel_at_period_end ?? false,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      status?: string;
      current_period_start?: string;
      current_period_end?: string;
      cancel_at_period_end?: boolean;
      canceled_at?: string | null;
    },
  ) {
    return this.subscriptionsService.update(id, {
      ...(body.status !== undefined && {
        status: body.status,
      }),
      ...(body.current_period_start !== undefined && {
        current_period_start: new Date(
          body.current_period_start,
        ),
      }),
      ...(body.current_period_end !== undefined && {
        current_period_end: new Date(
          body.current_period_end,
        ),
      }),
      ...(body.cancel_at_period_end !== undefined && {
        cancel_at_period_end:
          body.cancel_at_period_end,
      }),
      ...(body.canceled_at !== undefined && {
        canceled_at:
          body.canceled_at === null
            ? null
            : new Date(body.canceled_at),
      }),
    });
  }
}