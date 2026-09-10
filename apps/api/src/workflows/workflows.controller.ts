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
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { userId: string; email: string },
    @Query('project_id')
    projectId: string,
  ) {
    return this.workflowsService.findAll(
      user.userId,
      projectId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      project_id: string;
      name: string;
      slug: string;
      description?: string;
    },
  ) {
    return this.workflowsService.create(
      user.userId,
      body.project_id,
      body.name,
      body.slug,
      body.description,
    );
  }
}