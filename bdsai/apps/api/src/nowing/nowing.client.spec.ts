/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { NowingClient, NowingEngineError } from './nowing.client';

const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = fetchMock;

function createClient(overrides: Record<string, string> = {}): NowingClient {
  const defaults: Record<string, string> = {
    NOWING_ENGINE_URL: 'http://nowing.test:8000',
    NOWING_ENGINE_API_KEY: 'nowing-test-key',
    ...overrides,
  };
  const config: any = {
    get: jest.fn((key: string) => defaults[key]),
  };
  return new NowingClient(config as ConfigService<any, true>);
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function errorResponse(status: number, text = 'error'): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ status: 'error', detail: text }),
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

describe('NowingClient — Story 7.1a', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('health', () => {
    it('should return exactly field {status} from /health', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
      const client = createClient();
      const result = await client.health();
      expect(result).toEqual({ status: 'ok' });
    });

    it('should NOT return internal fields like apiKey or pat', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
      const client = createClient();
      const result = await client.health();
      expect(result).not.toHaveProperty('apiKey');
      expect(result).not.toHaveProperty('pat');
    });

    it('should classify "up" as healthy', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'up' }));
      const client = createClient();
      const result = await client.health();
      expect(result.status).toBe('up');
    });

    it('should assert request path and method', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
      const client = createClient();
      await client.health();
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(call[0]).toBe('http://nowing.test:8000/health');
      expect(call[1].method).toBe('GET');
      expect(call[1].body).toBeUndefined();
    });

    it('should set Authorization: Bearer <NOWING_ENGINE_API_KEY>', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
      const client = createClient();
      await client.health();
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = call[1].headers as Record<string, string>;
      expect(headers.authorization).toBe('Bearer nowing-test-key');
    });

    it('should handle NOWING_ENGINE_URL missing → throw NowingEngineError', () => {
      const client = createClient({ NOWING_ENGINE_URL: '' });
      expect(() => client).not.toThrow(); // lazy validation on call
      expect(client.health()).rejects.toThrow(NowingEngineError);
    });

    it('should handle NOWING_ENGINE_API_KEY missing → throw NowingEngineError', () => {
      const client = createClient({ NOWING_ENGINE_API_KEY: '' });
      expect(client.health()).rejects.toThrow(NowingEngineError);
    });

    it('should handle NOWING_ENGINE_URL with trailing slash', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ok' }));
      const client = createClient({ NOWING_ENGINE_URL: 'http://nowing.test:8000/' });
      await client.health();
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(call[0]).toBe('http://nowing.test:8000/health');
    });

    it('should handle Nowing returning 200 with {status: "degraded"}', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'degraded' }));
      const client = createClient();
      const result = await client.health();
      expect(result.status).toBe('degraded');
    });

    it('should handle Nowing returning 200 with non-JSON text body → throw NowingEngineError', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token')),
        text: () => Promise.resolve('not json'),
      } as unknown as Response);
      const client = createClient();
      await expect(client.health()).rejects.toThrow(NowingEngineError);
    });

    it('should throw NowingEngineError with status code 5xx when 503', async () => {
      fetchMock.mockResolvedValue(errorResponse(503, 'service unavailable'));
      const client = createClient();
      await expect(client.health()).rejects.toThrow(NowingEngineError);
    });

    it('should throw NowingEngineError on network timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);
      const client = createClient();
      await expect(client.health()).rejects.toThrow(NowingEngineError);
    });
  });

  describe('request (generic)', () => {
    it('should throw NowingEngineError (not generic Error) on 500', async () => {
      fetchMock.mockResolvedValue(errorResponse(500, 'server error'));
      const client = createClient();
      await expect(client.request('GET', '/health')).rejects.toThrow(NowingEngineError);
    });

    it('should include statusCode field in error for 500', async () => {
      fetchMock.mockResolvedValue(errorResponse(500, 'server error'));
      const client = createClient();
      await expect(client.request('GET', '/health')).rejects.toThrow(NowingEngineError);
      try {
        await client.request('GET', '/health');
      } catch (e) {
        expect(e).toBeInstanceOf(NowingEngineError);
        expect((e as NowingEngineError).statusCode).toBe(500);
      }
    });

    it('should throw NowingEngineAuthError with message containing "Invalid API key" for 401', async () => {
      fetchMock.mockResolvedValue(errorResponse(401, 'unauthorized'));
      const client = createClient();
      await expect(client.request('GET', '/health')).rejects.toThrow(/Invalid API key/);
    });

    it('should handle 403 Forbidden', async () => {
      fetchMock.mockResolvedValue(errorResponse(403, 'forbidden'));
      const client = createClient();
      await expect(client.request('GET', '/health')).rejects.toThrow(NowingEngineError);
    });

    it('should handle HTML error page', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Unexpected token')),
        text: () => Promise.resolve('<html>bad gateway</html>'),
      } as unknown as Response);
      const client = createClient();
      await expect(client.request('GET', '/health')).rejects.toThrow(NowingEngineError);
    });

    it('should set statusCode to exact HTTP status 503', async () => {
      fetchMock.mockResolvedValue(errorResponse(503, 'service unavailable'));
      const client = createClient();
      try {
        await client.request('GET', '/health');
      } catch (e) {
        expect((e as NowingEngineError).statusCode).toBe(503);
      }
    });
  });
});
