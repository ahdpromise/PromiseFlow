import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityManager,
  IsNull,
} from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
  ) {
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

  async create(
    currentUserId: string,
    organizationId: string,
    recipientUserId: string,
    type: string,
    title: string,
    message: string,
    targetPath?: string,
    metadata?: Record<string, unknown>,
    manager?: EntityManager,
  ) {
    const createNotification =
      async (
        entityManager:
          EntityManager,
      ) => {
        const result: Array<{
          notification_id: string;
        }> =
          await entityManager.query(
            `
              SELECT
                public.create_notification(
                  $1,
                  $2,
                  $3,
                  $4,
                  $5,
                  $6::jsonb
                ) AS notification_id
            `,
            [
              organizationId,
              recipientUserId,
              type,
              title,
              message,
              metadata
                ? JSON.stringify(
                    metadata,
                  )
                : null,
            ],
          );

        const notificationId =
          result[0]?.notification_id;

        if (
          notificationId &&
          targetPath
        ) {
          await entityManager.query(
            `
              UPDATE public.notifications
              SET target_path = $1
              WHERE id = $2
            `,
            [
              targetPath,
              notificationId,
            ],
          );
        }

        return result[0];
      };

    if (manager) {
      return createNotification(
        manager,
      );
    }

    return this.rlsContextService.run(
      currentUserId,
      createNotification,
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
              user_id:
                currentUserId,
              deleted_at:
                IsNull(),
            },
          });

        if (!notification) {
          throw new NotFoundException(
            'Notification not found',
          );
        }

        notification.read_at =
          new Date();

        return repository.save(
          notification,
        );
      },
    );
  }

  async remove(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const result: Array<{
          deleted: boolean;
        }> =
          await manager.query(
            `
              SELECT
                public.soft_delete_notification(
                  $1
                ) AS deleted
            `,
            [id],
          );

        if (!result[0]?.deleted) {
          throw new NotFoundException(
            'Notification not found',
          );
        }

        return {
          success: true,
        };
      },
    );
  }
}