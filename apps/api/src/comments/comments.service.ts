import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Comment } from '../entities/comment.entity';

@Injectable()
export class CommentsService {
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
        const repository = manager.getRepository(Comment);

        return repository.find({
          where: {
            task_id: taskId,
            deleted_at: IsNull(),
          },
          order: {
            created_at: 'ASC',
          },
        });
      },
    );
  }

  async create(
    currentUserId: string,
    taskId: string,
    content: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Comment);

        const comment = repository.create({
          task_id: taskId,
          user_id: currentUserId,
          content,
        });

        return repository.save(comment);
      },
    );
  }
}