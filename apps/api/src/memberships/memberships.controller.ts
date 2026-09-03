import {
  Body,
  Controller,
  Get,
  Post,
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
  findAll() {
    return this.membershipsService.findAll();
  }

  @Post()
  create(
    @Body() body: { organization_id: string },
    @CurrentUser() user: { userId: string; email: string },
  ) {
    return this.membershipsService.create(
      user.userId,
      body.organization_id,
    );
  }
}