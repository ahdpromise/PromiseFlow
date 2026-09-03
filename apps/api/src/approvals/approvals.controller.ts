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
    @Query('task_id') taskId: string,
  ) {
    return this.approvalsService.findAll(taskId);
  }

  @Post()
  create(
    @Body()
    body: {
      task_id: string;
      approver_user_id: string;
      comment?: string;
    },
  ) {
    return this.approvalsService.create(
      body.task_id,
      body.approver_user_id,
      body.comment,
    );
  }

  @Patch(':id/decision')
  decide(
    @Param('id') id: string,
    @Body()
    body: {
      status: 'approved' | 'rejected';
      comment?: string;
    },
  ) {
    return this.approvalsService.decide(
      id,
      body.status,
      body.comment,
    );
  }
}