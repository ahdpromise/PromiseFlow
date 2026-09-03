import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: { userId: string; email: string },
  ) {
    return this.notificationsService.findAll(user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string; email: string },
    @Body()
    body: {
      type: string;
      title: string;
      message: string;
    },
  ) {
    return this.notificationsService.create(
      user.userId,
      body.type,
      body.title,
      body.message,
    );
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; email: string },
  ) {
    return this.notificationsService.markAsRead(
      id,
      user.userId,
    );
  }
}