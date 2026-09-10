import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Permission } from '../entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async findAll() {
    return this.permissionsRepository.find({
      where: {
        deleted_at: IsNull(),
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findById(id: string) {
    const permission =
      await this.permissionsRepository.findOne({
        where: {
          id,
          deleted_at: IsNull(),
        },
      });

    if (!permission) {
      throw new NotFoundException(
        'Permission not found',
      );
    }

    return permission;
  }
}