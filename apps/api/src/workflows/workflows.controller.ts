import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
  ) {}

  @Get()
  findAll(
    @Query('project_id') projectId: string,
  ) {
    return this.workflowsService.findAll(projectId);
  }

  @Post()
  create(
    @Body()
    body: {
      project_id: string;
      name: string;
      slug: string;
      description?: string;
    },
  ) {
    return this.workflowsService.create(
      body.project_id,
      body.name,
      body.slug,
      body.description,
    );
  }
}