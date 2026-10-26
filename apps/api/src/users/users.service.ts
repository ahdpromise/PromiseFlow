import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { RlsContextService } from '../database/rls-context.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type LoginUserRecord = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,

    private readonly rlsContextService: RlsContextService,

    private readonly jwtService: JwtService,
  ) {}

  async findCurrentUser(
    currentUserId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const users = await manager.query(
          `
            SELECT
              id,
              first_name,
              last_name,
              email,
              email_verified_at,
              created_at,
              updated_at
            FROM public.users
            WHERE id = $1
              AND deleted_at IS NULL
            LIMIT 1
          `,
          [currentUserId],
        );

        const user = users[0];

        if (!user) {
          throw new NotFoundException(
            'User not found',
          );
        }

        return user;
      },
    );
  }

  async create(
    createUserDto: CreateUserDto,
  ) {
    const passwordHash = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    try {
      const result = await this.dataSource.query(
        `
          SELECT public.register_user(
            $1,
            $2,
            $3,
            $4
          ) AS user_id
        `,
        [
          createUserDto.first_name,
          createUserDto.last_name,
          createUserDto.email,
          passwordHash,
        ],
      );

      const userId = result[0]?.user_id;

      return {
        id: userId,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        email: createUserDto.email.toLowerCase(),
      };
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          'Email already exists',
        );
      }

      throw error;
    }
  }

  async login(
    loginUserDto: LoginUserDto,
  ) {
    const result =
      await this.dataSource.query(
        `
          SELECT *
          FROM public.get_user_for_login($1)
        `,
        [loginUserDto.email],
      );

    const user =
      result[0] as LoginUserRecord | undefined;

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const passwordValid =
      await bcrypt.compare(
        loginUserDto.password,
        user.password_hash,
      );

    if (!passwordValid) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const accessToken =
      this.jwtService.sign({
        sub: user.id,
        email: user.email,
      });

    return {
      message: 'Login successful',
      access_token: accessToken,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    };
  }

  async updatePassword(
    currentUserId: string,
    password: string,
  ) {
    const passwordHash =
      await bcrypt.hash(
        password,
        10,
      );

    await this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        await manager.query(
          `
            SELECT public.update_current_user_password(
              $1
            )
          `,
          [passwordHash],
        );
      },
    );

    return {
      message:
        'Password updated successfully',
    };
  }

  async updateProfile(
    currentUserId: string,
    dto: UpdateProfileDto,
  ) {
    await this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        await manager.query(
          `
            SELECT public.update_current_user_profile(
              $1,
              $2
            )
          `,
          [
            dto.first_name,
            dto.last_name,
          ],
        );
      },
    );

    return this.findCurrentUser(
      currentUserId,
    );
  }
}