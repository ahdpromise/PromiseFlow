import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
} from 'crypto';

import { RlsContextService } from '../database/rls-context.service';
import { ApiKey } from '../entities/api-keys.entity';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async create(
    currentUserId: string,
    organizationId: string,
    name: string,
    expiresAt: Date | null,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const organization =
          await manager
            .getRepository(Organization)
            .findOne({
              where: {
                id: organizationId,
              },
            });

        if (!organization) {
          throw new NotFoundException(
            'Organization not found',
          );
        }

        const rawKey =
          `pf_live_${randomBytes(32).toString('hex')}`;

        const keyPrefix =
          rawKey.slice(0, 16);

        const keyHash =
          this.hashKey(rawKey);

        const apiKeysRepository =
          manager.getRepository(ApiKey);

        const apiKey =
          apiKeysRepository.create({
            organization_id:
              organizationId,
            name,
            key_prefix: keyPrefix,
            key_hash: keyHash,
            last_used_at: null,
            expires_at: expiresAt,
            revoked_at: null,
          });

        const savedApiKey =
          await apiKeysRepository.save(
            apiKey,
          );

        return {
          id: savedApiKey.id,
          organization_id:
            savedApiKey.organization_id,
          name: savedApiKey.name,
          key_prefix:
            savedApiKey.key_prefix,
          api_key: rawKey,
          expires_at:
            savedApiKey.expires_at,
          created_at:
            savedApiKey.created_at,
        };
      },
    );
  }

  async findByOrganizationId(
    currentUserId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        return manager
          .getRepository(ApiKey)
          .find({
            where: {
              organization_id:
                organizationId,
            },
            order: {
              created_at: 'DESC',
            },
          });
      },
    );
  }

  async findById(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const apiKey =
          await manager
            .getRepository(ApiKey)
            .findOne({
              where: {
                id,
              },
            });

        if (!apiKey) {
          throw new NotFoundException(
            'API key not found',
          );
        }

        return apiKey;
      },
    );
  }

  async revoke(
    currentUserId: string,
    id: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const apiKeysRepository =
          manager.getRepository(ApiKey);

        const apiKey =
          await apiKeysRepository.findOne({
            where: {
              id,
            },
          });

        if (!apiKey) {
          throw new NotFoundException(
            'API key not found',
          );
        }

        if (apiKey.revoked_at) {
          throw new ConflictException(
            'API key is already revoked',
          );
        }

        apiKey.revoked_at = new Date();

        return apiKeysRepository.save(
          apiKey,
        );
      },
    );
  }

  private hashKey(
    rawKey: string,
  ) {
    return createHash('sha256')
      .update(rawKey)
      .digest('hex');
  }
}