import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId: string,
  ) {
    return this.projectsService.findAll(
      user.userId,
      organizationId,
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
      slug: string;
      description?: string;
    },
  ) {
    return this.projectsService.create(
      user.userId,
      body.organization_id,
      body.name,
      body.slug,
      body.description,
    );
  }
}