import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      organization_id: string;
      name: string;
      expires_at?: string | null;
    },
  ) {
    return this.apiKeysService.create(
      body.organization_id,
      body.name,
      body.expires_at
        ? new Date(body.expires_at)
        : null,
    );
  }

  @Get('organization/:organizationId')
  findByOrganizationId(
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.apiKeysService.findByOrganizationId(
      organizationId,
    );
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
  ) {
    return this.apiKeysService.findById(id);
  }

  @Patch(':id/revoke')
  revoke(
    @Param('id') id: string,
  ) {
    return this.apiKeysService.revoke(id);
  }
}