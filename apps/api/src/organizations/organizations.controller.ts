
import {
  BadRequestException,
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

  @Patch(':organizationId/settings')
  updateSettings(
    @Param('organizationId') organizationId: string,
    @Body() body: { name?: string; slug?: string },
    @CurrentUser()
    user: { userId: string; email: string },
  ) {
    const name = body?.name;
    const slug = body?.slug;

    if (
      typeof name !== 'string' ||
      name.trim().length === 0 ||
      name.trim().length > 150
    ) {
      throw new BadRequestException('Invalid organization name');
    }

    if (
      typeof slug !== 'string' ||
      slug.length > 100 ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
    ) {
      throw new BadRequestException('Invalid organization slug');
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        organizationId,
      )
    ) {
      throw new BadRequestException('Invalid organization ID');
    }

    return this.organizationsService.updateSettings(
      user.userId,
      organizationId,
      name.trim(),
      slug,
    );
  }
}
