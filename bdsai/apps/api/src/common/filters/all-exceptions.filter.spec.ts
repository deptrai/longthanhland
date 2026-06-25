import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter, type ApiError } from './all-exceptions.filter';

// Sentry 10 exports non-configurable props → jest.spyOn fail. Mock toàn module.
jest.mock('@sentry/node');

/**
 * Unit test AllExceptionsFilter (AC6, AC9) — Story 1.6.
 *
 * Assert shape chuẩn cho 3 case (E7):
 *   - HttpException 404 → { statusCode: 404, message, error: 'Not Found' }.
 *   - HttpException 503 + details → giữ details.
 *   - ZodError → 400 + details = issues.
 *   - generic Error → 500 generic, KHÔNG leak stack/message (AD-8).
 *   - Sentry.captureException được gọi (AC4).
 */
describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let reply: jest.Mock;
  const captureException = jest.mocked(Sentry.captureException);

  const mockHost = (url = '/test'): ArgumentsHost => {
    const res = { headersSent: false };
    return {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => ({ url, method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;
  };

  beforeEach(() => {
    reply = jest.fn();
    captureException.mockClear();
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const httpAdapter = { reply };
    const host = new HttpAdapterHost();
    host.httpAdapter = httpAdapter as never;
    filter = new AllExceptionsFilter(logger as unknown as Logger, host);
  });

  afterEach(() => {
    captureException.mockReset();
  });

  it('AC6a: HttpException 404 → shape { statusCode, message, error }', () => {
    const exc = new HttpException({ statusCode: 404, message: 'Not found', error: 'Not Found' }, 404);
    filter.catch(exc, mockHost('/x'));
    // httpAdapter.reply(response, body, statusCode) — 3 args.
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 404, message: 'Not found', error: 'Not Found' }),
      404,
    );
  });

  it('AC6a: HttpException 503 + details → giữ details (khớp health controller 1.2)', () => {
    const details = { db: { status: 'down' }, auth: { status: 'up' }, storage: { status: 'up' } };
    const exc = new HttpException(
      { statusCode: 503, message: 'degraded', error: 'Service Unavailable', details },
      503,
    );
    filter.catch(exc, mockHost('/health/supabase'));
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 503, message: 'degraded', error: 'Service Unavailable', details }),
      503,
    );
  });

  it('AC6c: ZodError → 400 + details = issues', () => {
    const zodErr = new ZodError([
      { code: 'invalid_type', path: ['foo'], message: 'expected string', expected: 'string', received: 'number' },
    ]);
    filter.catch(zodErr, mockHost());
    // reply(response, body, statusCode)
    const callArgs = reply.mock.calls[0] as [unknown, ApiError, number];
    const body = callArgs[1];
    const status = callArgs[2];
    expect(status).toBe(400);
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('AC6b: generic Error → 500 generic, KHÔNG leak message gốc (AD-8)', () => {
    const exc = new Error('DB password is hunter2 — postgres://user:pass@host');
    filter.catch(exc, mockHost());
    const callArgs = reply.mock.calls[0] as [unknown, ApiError, number];
    const body = callArgs[1];
    const status = callArgs[2];
    expect(status).toBe(500);
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(body.error).toBe('Internal Server Error');
    // AD-8: KHÔNG lộ message/stack gốc ra client.
    expect(JSON.stringify(body)).not.toMatch(/hunter2|postgres:\/\//);
  });

  it('AC4: Sentry.captureException được gọi cho mọi exception', () => {
    filter.catch(new Error('boom'), mockHost());
    expect(captureException).toHaveBeenCalled();
  });

  it('AC6a: HttpException string response → message = string, error = status text', () => {
    const exc = new HttpException('forbidden here', HttpStatus.FORBIDDEN);
    filter.catch(exc, mockHost());
    const callArgs = reply.mock.calls[0] as [unknown, ApiError, number];
    const body = callArgs[1];
    const status = callArgs[2];
    expect(status).toBe(403);
    expect(body.message).toBe('forbidden here');
    expect(body.error).toBe('Forbidden');
  });
});
