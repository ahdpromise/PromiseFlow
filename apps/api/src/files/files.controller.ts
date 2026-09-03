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
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
  ) {}

  @Get()
  findAll(
    @Query('task_id') taskId: string,
  ) {
    return this.filesService.findAll(taskId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string; email: string },
    @Body()
    body: {
      task_id: string;
      file_name: string;
      storage_key: string;
      mime_type: string;
      file_size: number;
    },
  ) {
    return this.filesService.create(
      body.task_id,
      user.userId,
      body.file_name,
      body.storage_key,
      body.mime_type,
      body.file_size,
    );
  }
}