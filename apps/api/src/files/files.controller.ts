import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { FilesService } from './files.service';
import { FileStorageService } from './storage/file-storage.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('task_id')
    taskId: string,
  ) {
    return this.filesService.findAll(
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
      task_id: string;
      file_name: string;
      storage_key: string;
      mime_type: string;
      file_size: number;
    },
  ) {
    return this.filesService.create(
      user.userId,
      body.task_id,
      body.file_name,
      body.storage_key,
      body.mime_type,
      body.file_size,
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Body('task_id')
    taskId: string,
    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    if (!taskId) {
      throw new BadRequestException(
        'task_id is required',
      );
    }

    if (!file) {
      throw new BadRequestException(
        'File is required',
      );
    }

    const storedFile =
      await this.fileStorageService.save(
        file,
      );

    return this.filesService.create(
      user.userId,
      taskId,
      file.originalname,
      storedFile.storageKey,
      file.mimetype ||
        'application/octet-stream',
      file.size,
    );
  }
}