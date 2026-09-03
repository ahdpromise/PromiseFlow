import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
  ) {}

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      organization_id: string;
      name: string;
      slug: string;
    },
  ) {
    return this.teamsService.create(
      body.organization_id,
      body.name,
      body.slug,
    );
  }
}