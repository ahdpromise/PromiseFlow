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
  findAll() {
    return this.organizationsService.findAll();
  }

  @Post()
  create(
    @Body() body: { name: string; slug: string },
    @CurrentUser() user: { userId: string; email: string },
  ) {
    return this.organizationsService.create(body.name, body.slug);
  }
}