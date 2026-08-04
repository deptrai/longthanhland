/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { XactionsClient } from './xactions-client';

// Mock global fetch. Each test configures fetchMock implementation.
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = fetchMock;

function createClient(overrides: Record<string, string> = {}): XactionsClient {
  const defaults: Record<string, string> = {
    XACTIONS_API_URL: 'http://xactions.test:3000',
    XACTIONS_API_TOKEN: 'test-jwt-token',
    XACTIONS_FB_ACCOUNT_ID: 'fb-account-1',
    ...overrides,
  };
  const config: any = {
    get: jest.fn((key: string) => defaults[key]),
  };
  return new XactionsClient(config as ConfigService<any, true>);
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
    json: () => Promise.resolve({ ok: false, error: text }),
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

describe('XactionsClient (AC2, AC8, E1-E12) — Story 5.2', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('postToFacebook', () => {
    it('200 ok:true → return { ok, operationId, postUrl }', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ ok: true, operationId: 'op-1', postUrl: 'https://fb.com/post/1', dryRun: false }),
      );
      const client = createClient();
      const result = await client.postToFacebook({
        text: 'hello',
        authCookie: { accountId: 'fb-account-1' },
      });
      expect(result).toEqual({ ok: true, operationId: 'op-1', postUrl: 'https://fb.com/post/1' });
    });

    it('assert request body shape: { action:"post", text, dryRun:false, authCookie:{accountId} }', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true, operationId: 'op-1', dryRun: false }));
      const client = createClient();
      await client.postToFacebook({ text: 'content here', authCookie: { accountId: 'acc-1' } });
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(call[0]).toBe('http://xactions.test:3000/api/facebook/automate');
      const opts = call[1];
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body as string);
      expect(body.action).toBe('post');
      expect(body.text).toBe('content here');
      expect(body.dryRun).toBe(false);
      expect(body.authCookie).toEqual({ accountId: 'acc-1' });
    });

    it('assert header Authorization: Bearer <token>', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true, operationId: 'op-1', dryRun: false }));
      const client = createClient();
      await client.postToFacebook({ text: 'x', authCookie: { accountId: 'acc-1' } });
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = call[1].headers as Record<string, string>;
      expect(headers.authorization).toBe('Bearer test-jwt-token');
      expect(headers['content-type']).toBe('application/json');
    });

    it('raw cookie path → authCookie { c_user, xs }', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true, operationId: 'op-1', dryRun: false }));
      const client = createClient({ XACTIONS_FB_ACCOUNT_ID: '' });
      await client.postToFacebook({ text: 'x', authCookie: { cUser: 'c1', xs: 'x1' } });
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(call[1].body as string);
      expect(body.authCookie).toEqual({ c_user: 'c1', xs: 'x1' });
    });

    it('E9: response ok:false → throw', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: false, error: 'FB automate failed' }));
      const client = createClient();
      await expect(
        client.postToFacebook({ text: 'x', authCookie: { accountId: 'acc-1' } }),
      ).rejects.toThrow('FB automate failed');
    });

    it('AC8: response dryRun:true → throw (defensive)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ ok: true, operationId: 'op-1', dryRun: true }),
      );
      const client = createClient();
      await expect(
        client.postToFacebook({ text: 'x', authCookie: { accountId: 'acc-1' } }),
      ).rejects.toThrow(/dryRun=true/);
    });

    it('E2: 400 → throw, KHÔNG retry', async () => {
      fetchMock.mockResolvedValue(errorResponse(400, 'bad request'));
      const client = createClient();
      await expect(
        client.postToFacebook({ text: 'x', authCookie: { accountId: 'acc-1' } }),
      ).rejects.toThrow(/HTTP 400/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('E12: 401 → throw "XActions auth failed"', async () => {
      fetchMock.mockResolvedValue(errorResponse(401, 'unauthorized'));
      const client = createClient();
      await expect(
        client.postToFacebook({ text: 'x', authCookie: { accountId: 'acc-1' } }),
      ).rejects.toThrow(/auth failed/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('E4: 500 → retry once rồi throw', async () => {
      fetchMock.mockResolvedValue(errorResponse(500, 'server error'));
      const client = createClient();
      await expect(
        client.postToFacebook({ text: 'x', authCookie: { accountId: 'acc-1' } }),
      ).rejects.toThrow(/HTTP 500/);
      // 2 calls: initial + 1 retry.
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('E4: 500 then 200 → success (retry works)', async () => {
      fetchMock
        .mockResolvedValueOnce(errorResponse(500, 'server error'))
        .mockResolvedValueOnce(jsonResponse({ ok: true, operationId: 'op-1', dryRun: false }));
      const client = createClient();
      const result = await client.postToFacebook({
        text: 'x',
        authCookie: { accountId: 'acc-1' },
      });
      expect(result.operationId).toBe('op-1');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('E1: timeout (AbortError) → throw, KHÔNG retry', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);
      const client = createClient();
      await expect(
        client.postToFacebook({ text: 'x', authCookie: { accountId: 'acc-1' } }),
      ).rejects.toThrow(/timeout/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('E6: accountId empty + c_user/xs empty → throw', async () => {
      const client = createClient({ XACTIONS_FB_ACCOUNT_ID: '' });
      await expect(
        client.postToFacebook({ text: 'x', authCookie: {} }),
      ).rejects.toThrow(/FB account not configured/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('E3: postUrl null/undefined → return postUrl null', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true, operationId: 'op-1', dryRun: false }));
      const client = createClient();
      const result = await client.postToFacebook({
        text: 'x',
        authCookie: { accountId: 'acc-1' },
      });
      expect(result.postUrl).toBeNull();
      expect(result.operationId).toBe('op-1');
    });
  });

  describe('getOperationStatus', () => {
    it('200 → return { status }', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'completed', result: { x: 1 } }));
      const client = createClient();
      const result = await client.getOperationStatus('op-1');
      expect(result).toEqual({ status: 'completed', result: { x: 1 }, error: undefined });
    });

    it('assert path /api/operations/status/:id', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'pending' }));
      const client = createClient();
      await client.getOperationStatus('op-xyz');
      const call = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(call[0]).toBe('http://xactions.test:3000/api/operations/status/op-xyz');
      expect(call[1].method).toBe('GET');
      expect(call[1].body).toBeUndefined();
    });

    it('404 → throw', async () => {
      fetchMock.mockResolvedValue(errorResponse(404, 'not found'));
      const client = createClient();
      await expect(client.getOperationStatus('op-missing')).rejects.toThrow(/HTTP 404/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('500 → retry once rồi throw', async () => {
      fetchMock.mockResolvedValue(errorResponse(500, 'server error'));
      const client = createClient();
      await expect(client.getOperationStatus('op-1')).rejects.toThrow(/HTTP 500/);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
