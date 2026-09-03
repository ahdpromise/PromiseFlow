import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProjectMembersService } from './project-members.service';

@Controller('project-members')
@UseGuards(JwtAuthGuard)
export class ProjectMembersController {
  constructor(
    private readonly projectMembersService: ProjectMembersService,
  ) {}

  @Get()
  findAll() {
    return this.projectMembersService.findAll();
  }

  @Post()
  create(
    @Body()
    body: {
      project_id: string;
      user_id: string;
    },
  ) {
    return this.projectMembersService.create(
      body.project_id,
      body.user_id,
    );
  }
}