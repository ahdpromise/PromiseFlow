import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
  ) {}

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      organization_id: string;
      name: string;
      url: string;
      events: string;
    },
  ) {
    return this.webhooksService.create(
      user.userId,
      body.organization_id,
      body.name,
      body.url,
      body.events,
    );
  }

  @Get('organization/:organizationId')
  findByOrganizationId(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.webhooksService.findByOrganizationId(
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
    return this.webhooksService.findById(
      user.userId,
      id,
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
      name?: string;
      url?: string;
      events?: string;
      is_active?: boolean;
    },
  ) {
    return this.webhooksService.update(
      user.userId,
      id,
      body,
    );
  }

  @Patch(':id/deactivate')
  deactivate(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    id: string,
  ) {
    return this.webhooksService.deactivate(
      user.userId,
      id,
    );
  }
}