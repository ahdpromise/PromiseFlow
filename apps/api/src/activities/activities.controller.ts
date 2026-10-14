import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ActivitiesService } from './activities.service';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId: string,
    @Query('action')
    action?: string,
    @Query('user_id')
    userId?: string,
    @Query('entity_type')
    entityType?: string,
    @Query('from')
    from?: string,
    @Query('to')
    to?: string,
    @Query('search')
    search?: string,
    @Query('page')
    page?: string,
    @Query('limit')
    limit?: string,
  ) {
    return this.activitiesService.findAll(
      user.userId,
      organizationId,
      {
        action,
        userId,
        entityType,
        from,
        to,
        search,
        page: page === undefined ? undefined : Number(page),
        limit: limit === undefined ? undefined : Number(limit),
      },
    );
  }
}