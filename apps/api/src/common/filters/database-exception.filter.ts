import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(
    exception: QueryFailedError,
    host: ArgumentsHost,
  ) {
    const response = host.switchToHttp().getResponse();

    const driverError = exception.driverError as {
      code?: string;
    };

    if (driverError.code === '42501') {
      return response
        .status(HttpStatus.FORBIDDEN)
        .json({
          message:
            'You do not have permission to perform this action',
          error: 'Forbidden',
          statusCode: HttpStatus.FORBIDDEN,
        });
    }

    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        message: 'Internal server error',
        statusCode:
          HttpStatus.INTERNAL_SERVER_ERROR,
      });
  }
}