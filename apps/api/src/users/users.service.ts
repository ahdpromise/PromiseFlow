import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  randomBytes,
  createHash,
} from 'node:crypto';

import { RlsContextService } from '../database/rls-context.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
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

    private readonly emailService: EmailService,
  ) {}

  private hashVerificationToken(
    token: string,
  ): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  async requestEmailVerification(
    dto: RequestEmailVerificationDto,
  ) {
    const email =
      dto.email.trim().toLowerCase();

    const verificationToken =
      randomBytes(32).toString('hex');

    const tokenHash =
      this.hashVerificationToken(
        verificationToken,
      );

    const result =
      await this.dataSource.query(
        `
          SELECT public.request_email_verification(
            $1,
            $2
          ) AS created
        `,
        [
          email,
          tokenHash,
        ],
      );

    if (result[0]?.created === true) {
      await this.emailService.sendEmailVerification(
        email,
        verificationToken,
      );
    }

    return {
      message:
        'If registration is available, a verification email will be sent.',
    };
  }

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
    if (
      Buffer.byteLength(
        createUserDto.password,
        'utf8',
      ) > 72
    ) {
      throw new BadRequestException(
        'Password must not exceed 72 bytes',
      );
    }

    if (
      !/^[0-9a-f]{64}$/.test(
        createUserDto.verification_token,
      )
    ) {
      throw new BadRequestException(
        'Invalid verification token',
      );
    }

    const firstName =
      createUserDto.first_name.trim();

    const lastName =
      createUserDto.last_name.trim();

    const email =
      createUserDto.email.trim().toLowerCase();

    const tokenHash =
      this.hashVerificationToken(
        createUserDto.verification_token,
      );

    const passwordHash =
      await bcrypt.hash(
        createUserDto.password,
        10,
      );

    try {
      const result =
        await this.dataSource.query(
          `
            SELECT public.complete_verified_registration(
              $1,
              $2,
              $3,
              $4,
              $5
            ) AS user_id
          `,
          [
            firstName,
            lastName,
            email,
            passwordHash,
            tokenHash,
          ],
        );

      const userId = result[0]?.user_id;

      return {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
      };
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          'Email already exists',
        );
      }

      if (
        error?.code === 'P0001' &&
        [
          'Invalid verification token',
          'Invalid or expired verification token',
        ].includes(error?.message)
      ) {
        throw new BadRequestException(
          'Invalid or expired verification token',
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