import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { userId: string; email: string },
    @Query('organization_id')
    organizationId: string,
  ) {
    return this.teamsService.findAll(
      user.userId,
      organizationId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      organization_id: string;
      name: string;
      slug: string;
    },
  ) {
    return this.teamsService.create(
      user.userId,
      body.organization_id,
      body.name,
      body.slug,
    );
  }
}