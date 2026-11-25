import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ThrottlerGuard } from '@nestjs/throttler';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post('request-email-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  requestEmailVerification(
    @Body()
    dto: RequestEmailVerificationDto,
  ) {
    return this.usersService.requestEmailVerification(
      dto,
    );
  }

  @Post()
  @UseGuards(ThrottlerGuard)
  create(
    @Body()
    dto: CreateUserDto,
  ) {
    return this.usersService.create(dto);
  }

  @Post('login')
  login(
    @Body()
    dto: LoginUserDto,
  ) {
    return this.usersService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(
    @CurrentUser()
    user: { userId: string; email: string },
  ) {
    return this.usersService.findCurrentUser(
      user.userId,
    );
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  updatePassword(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(
      user.userId,
      dto.password,
    );
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser()
    user: { userId: string; email: string },
    @Body()
    dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(
      user.userId,
      dto,
    );
  }
}