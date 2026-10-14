import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WorkflowStepsService } from './workflow-steps.service';

@Controller('workflow-steps')
@UseGuards(JwtAuthGuard)
export class WorkflowStepsController {
  constructor(
    private readonly workflowStepsService: WorkflowStepsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('workflow_id')
    workflowId: string,
  ) {
    return this.workflowStepsService.findAll(
      user.userId,
      workflowId,
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
      workflow_id: string;
      name: string;
      slug: string;
      step_type: string;
      position: number;
      description?: string;
    },
  ) {
    return this.workflowStepsService.create(
      user.userId,
      body.workflow_id,
      body.name,
      body.slug,
      body.step_type,
      body.position,
      body.description,
    );
  }

  @Patch('reorder')
  reorder(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Body()
    body: {
      workflow_id: string;
      step_ids: string[];
    },
  ) {
    return this.workflowStepsService.reorder(
      user.userId,
      body.workflow_id,
      body.step_ids,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    workflowStepId: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string | null;
      step_type?: string;
    },
  ) {
    return this.workflowStepsService.update(
      user.userId,
      workflowStepId,
      body,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    workflowStepId: string,
  ) {
    return this.workflowStepsService.remove(
      user.userId,
      workflowStepId,
    );
  }
}