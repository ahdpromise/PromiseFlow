
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MembershipsService } from './memberships.service';

@Controller('memberships')
@UseGuards(JwtAuthGuard)
export class MembershipsController {
  constructor(
    private readonly membershipsService: MembershipsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
  ) {
    return this.membershipsService.findAll(
      user.userId,
    );
  }

  @Get('directory')
  getOrganizationMemberDirectory(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId: string,
  ) {
    return this.membershipsService.getOrganizationMemberDirectory(
      user.userId,
      organizationId,
    );
  }
}
