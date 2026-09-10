import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post()
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
}