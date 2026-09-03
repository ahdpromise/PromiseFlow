import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Comment } from '../entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
  ) {}

  async findAll(taskId: string) {
    return this.commentsRepository.find({
      where: {
        task_id: taskId,
        deleted_at: IsNull(),
      },
      order: {
        created_at: 'ASC',
      },
    });
  }

  async create(
    taskId: string,
    userId: string,
    content: string,
  ) {
    const comment = this.commentsRepository.create({
      task_id: taskId,
      user_id: userId,
      content,
    });

    return this.commentsRepository.save(comment);
  }
}