import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async findAll(userId: string) {
    return this.notificationsRepository.find({
      where: {
        user_id: userId,
        deleted_at: IsNull(),
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async create(
    userId: string,
    type: string,
    title: string,
    message: string,
  ) {
    const notification = this.notificationsRepository.create({
      user_id: userId,
      type,
      title,
      message,
      read_at: null,
    });

    return this.notificationsRepository.save(notification);
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationsRepository.findOne({
      where: {
        id,
        user_id: userId,
        deleted_at: IsNull(),
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read_at = new Date();

    return this.notificationsRepository.save(notification);
  }
}