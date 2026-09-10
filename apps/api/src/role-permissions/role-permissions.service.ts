import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RlsContextService } from '../database/rls-context.service';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';

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

        const permission =
          await manager.getRepository(Permission).findOne({
            where: {
              id: permissionId,
            },
          });

        if (!permission || permission.deleted_at !== null) {
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

        const rolePermission =
          rolePermissionsRepository.create({
            role_id: roleId,
            permission_id: permissionId,
          });

        return rolePermissionsRepository.save(
          rolePermission,
        );
      },
    );
  }
}