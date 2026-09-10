import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { RolePermissionsService } from './role-permissions.service';

@Controller('roles/:roleId/permissions')
@UseGuards(JwtAuthGuard)
export class RolePermissionsController {
  constructor(
    private readonly rolePermissionsService: RolePermissionsService,
  ) {}

  @Get()
  findAllByRole(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('roleId')
    roleId: string,
  ) {
    return this.rolePermissionsService.findAllByRole(
      user.userId,
      roleId,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('roleId')
    roleId: string,
    @Body()
    body: {
      permission_id: string;
    },
  ) {
    return this.rolePermissionsService.create(
      user.userId,
      roleId,
      body.permission_id,
    );
  }
}