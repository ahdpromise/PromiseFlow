
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';

type CreatedRolePermissionResult = {
  id: string;
};

type PostgresError = {
  code?: string;
};

@Injectable()
export class RolePermissionsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAllByRole(
    currentUserId: string,
    roleId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        return manager.getRepository(RolePermission).find({
          where: {
            role_id: roleId,
          },
          relations: {
            permission: true,
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
    roleId: string,
    permissionId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const rolePermissionsRepository =
          manager.getRepository(RolePermission);

        const permission = await manager
          .getRepository(Permission)
          .findOne({
            where: {
              id: permissionId,
            },
          });

        if (
          !permission ||
          permission.deleted_at !== null
        ) {
          throw new NotFoundException(
            'Permission not found',
          );
        }

        const existing =
          await rolePermissionsRepository.findOne({
            where: {
              role_id: roleId,
              permission_id: permissionId,
            },
          });

        if (existing) {
          throw new ConflictException(
            'Permission is already assigned to this role',
          );
        }

        let result: CreatedRolePermissionResult[];

        try {
          result = await manager.query(
            `
              SELECT
                public.assign_role_permission(
                  $1::uuid,
                  $2::uuid
                ) AS id
            `,
            [roleId, permissionId],
          );
        } catch (error: unknown) {
          if (
            error instanceof QueryFailedError &&
            (error.driverError as PostgresError)?.code ===
              '23505'
          ) {
            throw new ConflictException(
              'Permission is already assigned to this role',
            );
          }

          throw error;
        }

        const assignmentId = result[0]?.id;

        if (!assignmentId) {
          throw new Error(
            'Role permission assignment did not return an ID',
          );
        }

        return rolePermissionsRepository.findOneOrFail({
          where: {
            id: assignmentId,
            role_id: roleId,
          },
        });
      },
    );
  }
}
