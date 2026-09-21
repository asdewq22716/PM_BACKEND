import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { FncCustom } from '../utils/fnc-custom';

/**
 * 1. Exception Filter: จัดการ Error ให้มีรูปแบบ JSON เป็นมาตรฐานเดียวกันทั้งระบบ
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception.response?.message ||
      exception.message ||
      'Internal Server Error';

    response.status(status).json({
      status: status,
      success: false,
      message: message,
      error: exception.name || 'Error',
      path: request.url,
      timestamp: FncCustom.dateNowISOString(),
    });
  }
}

/**
 * 2. Success Interceptor: ห่อหุ้ม Response สำเร็จให้มีรูปแบบ JSON มาตรฐาน
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        const statusCode = context.switchToHttp().getResponse().statusCode;

        return {
          status: statusCode,
          success: true,
          message: 'Success',
          data: data,
        };
      }),
    );
  }
}
