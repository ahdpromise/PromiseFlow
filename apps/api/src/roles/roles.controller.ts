import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { userId: string; email: string },
    @Query('organization_id')
    organizationId: string,
  ) {
    return this.rolesService.findAll(
      user.userId,
      organizationId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      organization_id: string;
      name: string;
      slug: string;
      description?: string;
    },
  ) {
    return this.rolesService.create(
      user.userId,
      body.organization_id,
      body.name,
      body.slug,
      body.description,
    );
  }
}