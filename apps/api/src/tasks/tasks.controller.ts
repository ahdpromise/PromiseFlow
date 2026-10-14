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
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('project_id')
    projectId: string,
  ) {
    return this.tasksService.findAll(
      user.userId,
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
    taskId: string,
  ) {
    return this.tasksService.findOne(
      user.userId,
      taskId,
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
      body.due_at
        ? new Date(body.due_at)
        : undefined,
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
    taskId: string,
    @Body()
    body: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      due_at?: string | null;
    },
  ) {
    return this.tasksService.update(
      user.userId,
      taskId,
      {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        due_at:
          body.due_at === null
            ? null
            : body.due_at
              ? new Date(body.due_at)
              : undefined,
      },
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
    taskId: string,
  ) {
    return this.tasksService.remove(
      user.userId,
      taskId,
    );
  }
}