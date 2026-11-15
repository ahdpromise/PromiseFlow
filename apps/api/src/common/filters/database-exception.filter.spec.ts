
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';

import { DatabaseExceptionFilter } from './database-exception.filter';

describe('DatabaseExceptionFilter', () => {
  let filter: DatabaseExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  const createDatabaseError = (
    code: string,
  ): QueryFailedError => {
    const driverError = Object.assign(
      new Error('Database test error'),
      { code },
    );

    return new QueryFailedError(
      'SELECT 1',
      [],
      driverError,
    );
  };

  beforeEach(() => {
    filter = new DatabaseExceptionFilter();

    json = jest.fn();

    status = jest.fn().mockReturnValue({
      json,
    });

    host = {
      switchToHttp: () => ({
        getResponse: () => ({
          status,
        }),
      }),
    } as unknown as ArgumentsHost;

    jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 403 for insufficient privileges (42501)', () => {
    filter.catch(
      createDatabaseError('42501'),
      host,
    );

    expect(status).toHaveBeenCalledWith(
      HttpStatus.FORBIDDEN,
    );

    expect(json).toHaveBeenCalledWith({
      message:
        'You do not have permission to perform this action',
      error: 'Forbidden',
      statusCode: 403,
    });
  });

  it('returns 409 for unique constraint violations (23505)', () => {
    filter.catch(
      createDatabaseError('23505'),
      host,
    );

    expect(status).toHaveBeenCalledWith(
      HttpStatus.CONFLICT,
    );

    expect(json).toHaveBeenCalledWith({
      message:
        'A record with this value already exists',
      error: 'Conflict',
      statusCode: 409,
    });
  });

  it('returns 500 for unexpected database errors', () => {
    filter.catch(
      createDatabaseError('XX000'),
      host,
    );

    expect(status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    expect(json).toHaveBeenCalledWith({
      message: 'Internal server error',
      error: 'Internal Server Error',
      statusCode: 500,
    });
  });
});
