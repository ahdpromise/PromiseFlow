import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  findAll(
    @Query('organization_id') organizationId: string,
  ) {
    return this.projectsService.findAll(
      organizationId,
    );
  }

  @Post()
  create(
    @Body()
    body: {
      organization_id: string;
      name: string;
      slug: string;
      description?: string;
    },
  ) {
    return this.projectsService.create(
      body.organization_id,
      body.name,
      body.slug,
      body.description,
    );
  }
}