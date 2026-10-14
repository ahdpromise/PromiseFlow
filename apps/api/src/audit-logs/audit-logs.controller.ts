import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId?: string,
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
    return this.auditLogsService.findAll(
      user.userId,
      organizationId,
      {
        action,
        userId,
        entityType,
        from,
        to,
        search,
        page:
          page === undefined
            ? undefined
            : Number(page),
        limit:
          limit === undefined
            ? undefined
            : Number(limit),
      },
    );
  }
}