
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Organization } from '../entities/organization.entity';

type DatabaseError = {
  code?: string;
  message?: string;
  driverError?: {
    code?: string;
    message?: string;
  };
};

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(userId: string) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const repository = manager.getRepository(Organization);

        return repository.find({
          where: {
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
    userId: string,
    name: string,
    slug: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const result: Array<{ organization_id: string }> =
          await manager.query(
            `
              SELECT public.bootstrap_organization(
                $1,
                $2
              ) AS organization_id
            `,
            [name, slug],
          );

        const organizationId = result[0]?.organization_id;

        const repository = manager.getRepository(Organization);

        return repository.findOneOrFail({
          where: {
            id: organizationId,
            deleted_at: IsNull(),
          },
        });
      },
    );
  }

  async updateSettings(
    userId: string,
    organizationId: string,
    name: string,
    slug: string,
  ) {
    try {
      return await this.rlsContextService.run(
        userId,
        async (manager) => {
          await manager.query(
            `
              SELECT public.update_organization_settings(
                $1,
                $2,
                $3
              )
            `,
            [organizationId, name, slug],
          );

          const repository = manager.getRepository(Organization);

          return repository.findOneOrFail({
            where: {
              id: organizationId,
              deleted_at: IsNull(),
            },
          });
        },
      );
    } catch (error: unknown) {
      const databaseError = error as DatabaseError;

      const code =
        databaseError.driverError?.code ??
        databaseError.code;

      const message =
        databaseError.driverError?.message ??
        databaseError.message ??
        '';

      if (
        code === '23505'
      ) {
        throw new ConflictException(
          'Organization slug already exists',
        );
      }

      if (
        code === 'P0001' &&
        message.includes('Permission denied')
      ) {
        throw new ForbiddenException(
          'You do not have permission to update this workspace',
        );
      }

      if (
        code === 'P0001' &&
        message.includes('Organization not found')
      ) {
        throw new NotFoundException(
          'Organization not found',
        );
      }

      throw error;
    }
  }
}
