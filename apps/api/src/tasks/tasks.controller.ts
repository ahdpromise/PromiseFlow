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
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  findAll(
    @Query('project_id') projectId: string,
  ) {
    return this.tasksService.findAll(projectId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string; email: string },
    @Body()
    body: {
      project_id: string;
      title: string;
      description?: string;
      workflow_step_id?: string;
      assigned_to_user_id?: string;
      status?: string;
      priority?: string;
      due_at?: string;
    },
  ) {
    return this.tasksService.create(
      user.userId,
      body.project_id,
      body.title,
      body.description,
      body.workflow_step_id,
      body.assigned_to_user_id,
      body.status,
      body.priority,
      body.due_at ? new Date(body.due_at) : undefined,
    );
  }
}