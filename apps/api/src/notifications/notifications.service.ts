import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(currentUserId: string) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Notification);

        return repository.find({
          where: {
            user_id: currentUserId,
            deleted_at: IsNull(),
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }

  async markAsRead(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository =
          manager.getRepository(Notification);

        const notification =
          await repository.findOne({
            where: {
              id,
              user_id: currentUserId,
              deleted_at: IsNull(),
            },
          });

        if (!notification) {
          throw new NotFoundException(
            'Notification not found',
          );
        }

        notification.read_at = new Date();

        return repository.save(notification);
      },
    );
  }
}