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

import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get('organization/:organizationId')
  findByOrganizationId(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.subscriptionsService.findByOrganizationId(
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
    return this.subscriptionsService.findById(
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
      plan_id: string;
      status: string;
      current_period_start: string;
      current_period_end: string;
      cancel_at_period_end?: boolean;
    },
  ) {
    return this.subscriptionsService.create(
      user.userId,
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
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    id: string,
    @Body()
    body: {
      status?: string;
      current_period_start?: string;
      current_period_end?: string;
      cancel_at_period_end?: boolean;
      canceled_at?: string | null;
    },
  ) {
    return this.subscriptionsService.update(
      user.userId,
      id,
      {
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
      },
    );
  }
}