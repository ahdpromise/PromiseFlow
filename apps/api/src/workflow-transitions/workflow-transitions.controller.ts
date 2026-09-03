import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

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
    @Query('workflow_id') workflowId: string,
  ) {
    return this.workflowTransitionsService.findAll(workflowId);
  }

  @Post()
  create(
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
      body.workflow_id,
      body.from_step_id,
      body.to_step_id,
      body.name,
      body.slug,
      body.condition,
    );
  }
}