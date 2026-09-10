import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { userId: string; email: string },
  ) {
    return this.organizationsService.findAll(user.userId);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      slug: string;
    },
    @CurrentUser()
    user: { userId: string; email: string },
  ) {
    return this.organizationsService.create(
      user.userId,
      body.name,
      body.slug,
    );
  }
}