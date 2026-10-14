import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AutomationsService } from './automations.service';

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationsController {
  constructor(
    private readonly automationsService: AutomationsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organization_id is required',
      );
    }

    return this.automationsService.findAll(
      user.userId,
      organizationId,
    );
  }

  @Get(':id/runs')
  findRuns(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    automationId: string,
  ) {
    return this.automationsService.findRuns(
      user.userId,
      automationId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Body()
    body: {
      organization_id: string;
      name: string;
      description?: string;
      trigger_type: string;
      trigger_config?: Record<
        string,
        unknown
      >;
      action_type: string;
      action_config?: Record<
        string,
        unknown
      >;
    },
  ) {
    if (!body.organization_id) {
      throw new BadRequestException(
        'organization_id is required',
      );
    }

    return this.automationsService.create(
      user.userId,
      body.organization_id,
      body.name,
      body.description,
      body.trigger_type,
      body.action_type,
      body.trigger_config,
      body.action_config,
    );
  }

  @Patch(':id/enabled')
  setEnabled(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    automationId: string,
    @Body()
    body: {
      is_enabled: boolean;
    },
  ) {
    return this.automationsService.setEnabled(
      user.userId,
      automationId,
      body.is_enabled,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    automationId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      trigger_type: string;
      trigger_config?: Record<
        string,
        unknown
      >;
      action_type: string;
      action_config?: Record<
        string,
        unknown
      >;
    },
  ) {
    return this.automationsService.update(
      user.userId,
      automationId,
      body.name,
      body.description,
      body.trigger_type,
      body.action_type,
      body.trigger_config,
      body.action_config,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    automationId: string,
  ) {
    return this.automationsService.remove(
      user.userId,
      automationId,
    );
  }
}