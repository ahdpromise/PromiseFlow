import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(
    private readonly approvalsService: ApprovalsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('task_id')
    taskId?: string,
    @Query('status')
    status?: string,
    @Query('project_id')
    projectId?: string,
  ) {
    return this.approvalsService.findAll(
      user.userId,
      taskId,
      status,
      projectId,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    id: string,
  ) {
    return this.approvalsService.findOne(
      user.userId,
      id,
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
      task_id: string;
      approver_user_id: string;
      comment?: string;
    },
  ) {
    return this.approvalsService.create(
      user.userId,
      body.task_id,
      body.approver_user_id,
      body.comment,
    );
  }

  @Patch(':id/decision')
  decide(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    id: string,
    @Body()
    body: {
      status:
        | 'approved'
        | 'rejected';
      decision_comment?: string;
    },
  ) {
    return this.approvalsService.decide(
      user.userId,
      id,
      body.status,
      body.decision_comment,
    );
  }
}