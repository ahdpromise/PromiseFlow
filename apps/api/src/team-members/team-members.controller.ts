import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TeamMembersService } from './team-members.service';

@Controller('team-members')
@UseGuards(JwtAuthGuard)
export class TeamMembersController {
  constructor(
    private readonly teamMembersService: TeamMembersService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: {
      userId: string;
      email: string;
    },
    @Query('team_id')
    teamId?: string,
  ) {
    return this.teamMembersService.findAll(
      user.userId,
      teamId,
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
      team_id: string;
      user_id: string;
    },
  ) {
    return this.teamMembersService.create(
      user.userId,
      body.team_id,
      body.user_id,
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
    teamMemberId: string,
  ) {
    return this.teamMembersService.remove(
      user.userId,
      teamMemberId,
    );
  }
}