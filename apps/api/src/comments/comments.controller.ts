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
import { CommentsService } from './comments.service';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
  ) {}

  @Get()
  findAll(
    @Query('task_id') taskId: string,
  ) {
    return this.commentsService.findAll(taskId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string; email: string },
    @Body()
    body: {
      task_id: string;
      content: string;
    },
  ) {
    return this.commentsService.create(
      body.task_id,
      user.userId,
      body.content,
    );
  }
}