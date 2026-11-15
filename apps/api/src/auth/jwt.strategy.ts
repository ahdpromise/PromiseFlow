
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { RlsContextService } from '../database/rls-context.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly rlsContext: RlsContextService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload) {
    if (
      !payload ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      payload.email.trim().length === 0 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.sub,
      )
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const isActive = await this.rlsContext.run(
      payload.sub,
      async (manager) => {
        const rows: Array<{ active: boolean }> =
          await manager.query(
            'SELECT public.is_user_active($1) AS active',
            [payload.sub],
          );

        return Array.isArray(rows) &&
          rows[0]?.active === true;
      },
    );

    if (!isActive) {
      throw new UnauthorizedException(
        'User account is inactive or does not exist',
      );
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
