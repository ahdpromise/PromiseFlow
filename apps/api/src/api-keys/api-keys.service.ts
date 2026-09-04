import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHash,
  randomBytes,
} from 'crypto';
import { Repository } from 'typeorm';

import { ApiKey } from '../entities/api-keys.entity';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeysRepository: Repository<ApiKey>,

    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  async create(
    organizationId: string,
    name: string,
    expiresAt: Date | null,
  ) {
    const organization =
      await this.organizationsRepository.findOne({
        where: {
          id: organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    const rawKey = `pf_live_${randomBytes(32).toString('hex')}`;

    const keyPrefix = rawKey.slice(0, 16);

    const keyHash = this.hashKey(rawKey);

    const apiKey =
      this.apiKeysRepository.create({
        organization_id: organizationId,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        last_used_at: null,
        expires_at: expiresAt,
        revoked_at: null,
      });

    const savedApiKey =
      await this.apiKeysRepository.save(apiKey);

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
  }

  async findByOrganizationId(
    organizationId: string,
  ) {
    return this.apiKeysRepository.find({
      where: {
        organization_id: organizationId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async findById(id: string) {
    const apiKey =
      await this.apiKeysRepository.findOne({
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
  }

  async revoke(id: string) {
    const apiKey =
      await this.findById(id);

    if (apiKey.revoked_at) {
      throw new ConflictException(
        'API key is already revoked',
      );
    }

    apiKey.revoked_at = new Date();

    return this.apiKeysRepository.save(
      apiKey,
    );
  }

  private hashKey(rawKey: string) {
    return createHash('sha256')
      .update(rawKey)
      .digest('hex');
  }
}