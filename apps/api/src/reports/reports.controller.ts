import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
  ) {}

  private validateDateRange(
    from?: string,
    to?: string,
  ) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (from && !datePattern.test(from)) {
      throw new BadRequestException(
        'from must use YYYY-MM-DD format',
      );
    }

    if (to && !datePattern.test(to)) {
      throw new BadRequestException(
        'to must use YYYY-MM-DD format',
      );
    }

    if (
      from &&
      Number.isNaN(
        Date.parse(`${from}T00:00:00Z`),
      )
    ) {
      throw new BadRequestException(
        'from must be a valid date',
      );
    }

    if (
      to &&
      Number.isNaN(
        Date.parse(`${to}T00:00:00Z`),
      )
    ) {
      throw new BadRequestException(
        'to must be a valid date',
      );
    }

    if (from && to && from > to) {
      throw new BadRequestException(
        'from must be before or equal to to',
      );
    }
  }

  @Get('overview')
  getOverview(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId?: string,
    @Query('from')
    from?: string,
    @Query('to')
    to?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organization_id is required',
      );
    }

    this.validateDateRange(from, to);

    return this.reportsService.getOverview(
      user.userId,
      organizationId,
      from,
      to,
    );
  }

  @Get('tasks-by-status')
  getTasksByStatus(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId?: string,
    @Query('from')
    from?: string,
    @Query('to')
    to?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organization_id is required',
      );
    }

    this.validateDateRange(from, to);

    return this.reportsService.getTasksByStatus(
      user.userId,
      organizationId,
      from,
      to,
    );
  }

  @Get('tasks-by-priority')
  getTasksByPriority(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId?: string,
    @Query('from')
    from?: string,
    @Query('to')
    to?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organization_id is required',
      );
    }

    this.validateDateRange(from, to);

    return this.reportsService.getTasksByPriority(
      user.userId,
      organizationId,
      from,
      to,
    );
  }

  @Get('project-performance')
  getProjectPerformance(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId?: string,
    @Query('from')
    from?: string,
    @Query('to')
    to?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organization_id is required',
      );
    }

    this.validateDateRange(from, to);

    return this.reportsService.getProjectPerformance(
      user.userId,
      organizationId,
      from,
      to,
    );
  }

  @Get('approval-statistics')
  getApprovalStatistics(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('organization_id')
    organizationId?: string,
    @Query('from')
    from?: string,
    @Query('to')
    to?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException(
        'organization_id is required',
      );
    }

    this.validateDateRange(from, to);

    return this.reportsService.getApprovalStatistics(
      user.userId,
      organizationId,
      from,
      to,
    );
  }
}