import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { File } from '../entities/file.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File)
    private readonly filesRepository: Repository<File>,
  ) {}

  async findAll(taskId: string) {
    return this.filesRepository.find({
      where: {
        task_id: taskId,
        deleted_at: IsNull(),
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async create(
    taskId: string,
    userId: string,
    fileName: string,
    storageKey: string,
    mimeType: string,
    fileSize: number,
  ) {
    const file = this.filesRepository.create({
      task_id: taskId,
      uploaded_by_user_id: userId,
      file_name: fileName,
      storage_key: storageKey,
      mime_type: mimeType,
      file_size: fileSize,
    });

    return this.filesRepository.save(file);
  }
}