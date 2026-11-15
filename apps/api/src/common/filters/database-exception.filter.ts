import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

type PostgresDriverError = {
  code?: string;
  constraint?: string;
  table?: string;
};

@Catch(QueryFailedError)
export class DatabaseExceptionFilter
  implements ExceptionFilter
{
  catch(
    exception: QueryFailedError,
    host: ArgumentsHost,
  ) {
    const response =
      host.switchToHttp().getResponse();

    const driverError =
      exception.driverError as PostgresDriverError;

    const code = driverError.code;

    if (code === '42501') {
      return response
        .status(HttpStatus.FORBIDDEN)
        .json({
          message:
            'You do not have permission to perform this action',
          error: 'Forbidden',
          statusCode: HttpStatus.FORBIDDEN,
        });
    }

    if (code === '23505') {
      return response
        .status(HttpStatus.CONFLICT)
        .json({
          message:
            'A record with this value already exists',
          error: 'Conflict',
          statusCode: HttpStatus.CONFLICT,
        });
    }

    console.error('[DatabaseExceptionFilter]', {
      code: code ?? 'UNKNOWN',
      table: driverError.table,
      constraint: driverError.constraint,
    });

    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        message: 'Internal server error',
        error: 'Internal Server Error',
        statusCode:
          HttpStatus.INTERNAL_SERVER_ERROR,
      });
  }
}