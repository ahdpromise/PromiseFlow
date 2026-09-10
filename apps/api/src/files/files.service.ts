import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { File } from '../entities/file.entity';

@Injectable()
export class FilesService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    taskId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(File);

        return repository.find({
          where: {
            task_id: taskId,
            deleted_at: IsNull(),
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }

  async create(
    currentUserId: string,
    taskId: string,
    fileName: string,
    storageKey: string,
    mimeType: string,
    fileSize: number,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(File);

        const file = repository.create({
          task_id: taskId,
          uploaded_by_user_id: currentUserId,
          file_name: fileName,
          storage_key: storageKey,
          mime_type: mimeType,
          file_size: fileSize,
        });

        return repository.save(file);
      },
    );
  }
}