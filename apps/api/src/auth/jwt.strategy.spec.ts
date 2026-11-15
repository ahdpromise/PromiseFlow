
import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
} from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';

import { JwtStrategy } from './jwt.strategy';
import { RlsContextService } from '../database/rls-context.service';

describe('JwtStrategy security', () => {
  const validPayload = {
    sub: '36177907-1f1a-432f-8285-52294584bdd9',
    email: 'security-test@example.invalid',
  };

  let strategy: JwtStrategy;

  const queryMock = jest.fn<
    (sql: string, parameters: unknown[]) => Promise<Array<{ active: boolean }>>
  >();

  const runMock = jest.fn<RlsContextService['run']>();

  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret-not-for-production';

    queryMock.mockReset();
    runMock.mockReset();

    runMock.mockImplementation(async (_userId, callback) => {
      return callback({
        query: queryMock,
      } as never);
    });

    strategy = new JwtStrategy({
      run: runMock,
    } as unknown as RlsContextService);
  });

  it('accepts an active user', async () => {
    queryMock.mockResolvedValue([{ active: true }]);

    await expect(strategy.validate(validPayload)).resolves.toEqual({
      userId: validPayload.sub,
      email: validPayload.email,
    });

    expect(runMock).toHaveBeenCalledWith(
      validPayload.sub,
      expect.any(Function),
    );

    expect(queryMock).toHaveBeenCalledWith(
      'SELECT public.is_user_active($1) AS active',
      [validPayload.sub],
    );
  });

  it('rejects a soft-deleted user', async () => {
    queryMock.mockResolvedValue([{ active: false }]);

    await expect(
      strategy.validate(validPayload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a user that does not exist', async () => {
    queryMock.mockResolvedValue([]);

    await expect(
      strategy.validate(validPayload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a malformed user ID', async () => {
    await expect(
      strategy.validate({
        sub: 'invalid-user-id',
        email: validPayload.email,
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(runMock).not.toHaveBeenCalled();
  });

  it('rejects a token payload without an email', async () => {
    await expect(
      strategy.validate({
        sub: validPayload.sub,
        email: '',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(runMock).not.toHaveBeenCalled();
  });
});
