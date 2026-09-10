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
import { WorkflowTransitionsService } from './workflow-transitions.service';

@Controller('workflow-transitions')
@UseGuards(JwtAuthGuard)
export class WorkflowTransitionsController {
  constructor(
    private readonly workflowTransitionsService: WorkflowTransitionsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { userId: string; email: string },
    @Query('workflow_id')
    workflowId: string,
  ) {
    return this.workflowTransitionsService.findAll(
      user.userId,
      workflowId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      workflow_id: string;
      from_step_id: string;
      to_step_id: string;
      name: string;
      slug: string;
      condition?: string;
    },
  ) {
    return this.workflowTransitionsService.create(
      user.userId,
      body.workflow_id,
      body.from_step_id,
      body.to_step_id,
      body.name,
      body.slug,
      body.condition,
    );
  }
}