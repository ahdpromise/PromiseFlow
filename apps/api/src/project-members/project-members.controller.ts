import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectMembersService } from './project-members.service';

@Controller('project-members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
  constructor(
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: { userId: string; email: string },
  ) {
    return this.projectMembersService.findAll(
      user.userId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      project_id: string;
      user_id: string;
    },
  ) {
    return this.projectMembersService.create(
      user.userId,
      body.project_id,
      body.user_id,
    );
  }
}