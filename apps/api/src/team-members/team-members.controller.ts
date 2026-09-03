import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { TeamMembersService } from './team-members.service';

@Controller('team-members')
@UseGuards(JwtAuthGuard)
export class TeamMembersController {
  constructor(
    private readonly teamMembersService: TeamMembersService,
  ) {}

  @Get()
  findAll() {
    return this.teamMembersService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      team_id: string;
      user_id: string;
    },
  ) {
    return this.teamMembersService.create(
      body.team_id,
      body.user_id,
    );
  }
}