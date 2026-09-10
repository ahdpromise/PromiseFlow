import {
  Body,
  Controller,
  Get,
  Post,
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
    user: { userId: string; email: string },
  ) {
    return this.teamMembersService.findAll(
      user.userId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
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
}