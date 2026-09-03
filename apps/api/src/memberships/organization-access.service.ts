import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { MembershipsService } from './memberships.service';

@Injectable()
export class OrganizationAccessService {
  constructor(
    private readonly membershipsService: MembershipsService,
  ) {}

  async assertMember(
    userId: string,
    organizationId: string,
  ) {
    const membership =
      await this.membershipsService.findByUserAndOrganization(
        userId,
        organizationId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }

    return membership;
  }
}