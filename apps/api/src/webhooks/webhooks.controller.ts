import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      organization_id: string;
      name: string;
      url: string;
      events: string;
    },
  ) {
    return this.webhooksService.create(
      body.organization_id,
      body.name,
      body.url,
      body.events,
    );
  }

  @Get('organization/:organizationId')
  findByOrganizationId(
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.webhooksService.findByOrganizationId(
      organizationId,
    );
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
  ) {
    return this.webhooksService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      url?: string;
      events?: string;
      is_active?: boolean;
    },
  ) {
    return this.webhooksService.update(
      id,
      body,
    );
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id') id: string,
  ) {
    return this.webhooksService.deactivate(
      id,
    );
  }
}