import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
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
    user: {
      userId: string;
      email: string;
    },
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
    user: {
      userId: string;
      email: string;
    },
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

  @Patch(':id')
  update(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    teamId: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string | null;
    },
  ) {
    return this.teamsService.update(
      user.userId,
      teamId,
      body,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Param('id')
    teamId: string,
  ) {
    return this.teamsService.remove(
      user.userId,
      teamId,
    );
  }
}