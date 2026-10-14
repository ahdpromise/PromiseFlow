import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser()
    user: { userId: string; email: string },
    @Query('organization_id')
    organizationId: string,
  ) {
    return this.invitationsService.findAll(
      user.userId,
      organizationId,
    );
  }

  @Post()
  async create(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      organization_id: string;
      email: string;
      role_id: string;
      expires_at: string;
    },
  ) {
    return this.invitationsService.create(
      user.userId,
      body.organization_id,
      body.email,
      body.role_id,
      new Date(body.expires_at),
    );
  }

  @Patch('accept')
  async accept(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    body: {
      token: string;
    },
  ) {
    return this.invitationsService.accept(
      user.userId,
      body.token,
    );
  }

  @Patch(':id/revoke')
  async revoke(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    invitationId: string,
  ) {
    return this.invitationsService.revoke(
      user.userId,
      invitationId,
    );
  }

  @Patch(':id/resend')
  async resend(
    @CurrentUser()
    user: { userId: string; email: string },
    @Param('id')
    invitationId: string,
  ) {
    return this.invitationsService.resend(
      user.userId,
      invitationId,
    );
  }
}