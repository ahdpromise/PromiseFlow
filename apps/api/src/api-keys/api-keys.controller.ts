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

import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
  ) {}

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      organization_id: string;
      name: string;
      expires_at?: string | null;
    },
  ) {
    return this.apiKeysService.create(
      user.userId,
      body.organization_id,
      body.name,
      body.expires_at
        ? new Date(body.expires_at)
        : null,
    );
  }

  @Get('organization/:organizationId')
  findByOrganizationId(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('organizationId')
    organizationId: string,
  ) {
    return this.apiKeysService.findByOrganizationId(
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
    return this.apiKeysService.findById(
      user.userId,
      id,
    );
  }

  @Patch(':id/revoke')
  revoke(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    id: string,
  ) {
    return this.apiKeysService.revoke(
      user.userId,
      id,
    );
  }
}