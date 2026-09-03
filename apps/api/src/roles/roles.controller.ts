import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(
    @CurrentUser() user: { userId: string; email: string },
    @Query('organization_id') organizationId: string,
  ) {
    return this.rolesService.findAll(organizationId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string; email: string },
    @Body()
    body: {
      organization_id: string;
      name: string;
      slug: string;
      description?: string;
    },
  ) {
    return this.rolesService.create(
      body.organization_id,
      body.name,
      body.slug,
      body.description,
    );
  }
}