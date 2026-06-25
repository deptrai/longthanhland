import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import type { Request, Response } from 'express';
import { HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

/**
 * Error shape chuẩn (Consistency Conventions dòng 129, AC6) — Story 1.6.
 * `{ statusCode, message, error?, details? }`
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
}

/**
 * AllExceptionsFilter (AC6, AD-8, AC4) — Story 1.6.
 *
 * Global exception filter — normalize MỌI exception ra error shape chuẩn:
 *   - HttpException: giữ statusCode + message + error + details (nếu có).
 *   - ZodError: map 400 + details = zod issues (AC6c).
 *   - Non-HttpException (Error gốc): 500 generic — KHÔNG leak stack/message ra
 *     client (AD-8), log full stack server-side (pino).
 *
 * AC4: Sentry.captureException(exception) trước khi return response (E2 no-op khi
 * Sentry chưa init — SDK handle tự).
 *
 * Đăng ký global qua APP_FILTER (app.module) → áp dụng cho mọi e2e test.
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: Logger,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // AC4: capture exception vào Sentry (no-op khi chưa init — E2).
    Sentry.captureException(exception);

    const apiError = this.normalize(exception);

    // AD-8: log full stack server-side, KHÔNG gửi stack ra client.
    const logContext = {
      statusCode: apiError.statusCode,
      path: request.url,
      method: request.method,
      err: exception instanceof Error ? { name: exception.name, message: exception.message, stack: exception.stack } : exception,
    };
    if (apiError.statusCode >= 500) {
      this.logger.error(logContext, `Unhandled exception: ${apiError.message}`);
    } else {
      this.logger.warn(logContext, `Exception: ${apiError.message}`);
    }

    // Dùng httpAdapter để set status + body (hoạt động cả khi response chưa flush).
    const { httpAdapter } = this.httpAdapterHost;
    if (!response.headersSent) {
      httpAdapter.reply(response, apiError, apiError.statusCode);
    }
  }

  /** Map exception → ApiError shape chuẩn (AC6a/b/c). */
  private normalize(exception: unknown): ApiError {
    // AC6c: ZodError → 400 + details = issues.
    if (exception instanceof ZodError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        error: 'Bad Request',
        details: exception.issues,
      };
    }

    // AC6a: HttpException — giữ shape gốc (controller đã set chuẩn).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const body = typeof res === 'object' && res !== null ? (res as Record<string, unknown>) : null;

      if (body && typeof body['statusCode'] === 'number') {
        return {
          statusCode: body['statusCode'] as number,
          message: typeof body['message'] === 'string' ? body['message'] : exception.message,
          error: typeof body['error'] === 'string' ? body['error'] : undefined,
          details: body['details'],
        };
      }

      // HttpException với response là string (vd throw new HttpException('msg', 400)).
      return {
        statusCode: status,
        message: typeof res === 'string' ? res : exception.message,
        error: this.statusText(status),
      };
    }

    // AC6b: non-HttpException → 500 generic. KHÔNG leak message gốc (AD-8).
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };
  }

  /** Map status code → status text (NestJS HttpStatus → text). */
  private statusText(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };
    return map[status] ?? 'Error';
  }
}
