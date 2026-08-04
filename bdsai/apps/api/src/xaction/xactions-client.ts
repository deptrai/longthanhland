import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

/**
 * XactionsClient (AC2) — Story 5.2.
 *
 * HTTP client wrapping XActions REST API (Express.js self-hosted).
 * Dùng global fetch + AbortController (Node 18+ built-in — KHÔNG thêm axios).
 *
 * Methods:
 *   - postToFacebook({ text, authCookie, dryRun? }) → POST /api/facebook/automate
 *     với body { action:'post', text, dryRun:false, authCookie }. dryRun LUÔN false
 *     (AC8 — bdsai.vn đăng thật). Throw nếu response ok:false hoặc dryRun:true.
 *   - getOperationStatus(operationId) → GET /api/operations/status/:operationId.
 *
 * Error handling:
 *   - Timeout 30s (AbortController) → throw (E1).
 *   - 4xx → throw ngay (KHÔNG retry — E2/E12). 401 → message rõ.
 *   - 5xx → retry 1 lần (simple), vẫn fail → throw (E4).
 *   - Response ok:false → throw Error(error) (E9).
 *
 * AD-8: KHÔNG log raw token/cookie. Header Authorization không log.
 */
export interface FacebookAuthCookie {
  // Stored account path (preferred — server-side decrypt).
  accountId?: string;
  // Raw cookie fallback (MVP).
  cUser?: string;
  xs?: string;
}

export interface PostToFacebookParams {
  text: string;
  authCookie: FacebookAuthCookie;
  // Story 5.5: image URLs to attach (forward-compatible — XActions mediaUrls field
  // exists but upload not yet implemented; when XActions adds upload, this works).
  mediaUrls?: string[];
  // Test override only — production LUÔN false (AC8).
  dryRun?: boolean;
}

export interface PostToFacebookResult {
  ok: true;
  operationId: string;
  postUrl: string | null;
}

export interface OperationStatusResult {
  status: string;
  result?: unknown;
  error?: string;
}

const TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;

@Injectable()
export class XactionsClient {
  private readonly logger = new Logger(XactionsClient.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.baseUrl = (this.config.get('XACTIONS_API_URL', { infer: true }) ?? 'http://localhost:3000').replace(/\/$/, '');
    this.token = this.config.get('XACTIONS_API_TOKEN', { infer: true }) ?? '';
  }

  async postToFacebook(params: PostToFacebookParams): Promise<PostToFacebookResult> {
    // E6: account config missing — cả accountId lẫn c_user/xs empty.
    const cookie = params.authCookie;
    const hasAccountId = !!cookie.accountId && cookie.accountId.trim().length > 0;
    const hasRawCookie = !!cookie.cUser && !!cookie.xs && cookie.cUser.trim().length > 0 && cookie.xs.trim().length > 0;
    if (!hasAccountId && !hasRawCookie) {
      throw new Error(
        'FB account not configured — set XACTIONS_FB_ACCOUNT_ID or XACTIONS_FB_C_USER+XACTIONS_FB_XS',
      );
    }

    // AC8: dryRun LUÔN false (bdsai.vn đăng thật). Param chỉ cho test override.
    const dryRun = params.dryRun ?? false;
    const body = {
      action: 'post' as const,
      text: params.text,
      dryRun,
      authCookie: hasAccountId ? { accountId: cookie.accountId } : { c_user: cookie.cUser, xs: cookie.xs },
      // Story 5.5: forward-compatible — XActions validates type but upload not yet implemented.
      mediaUrls: params.mediaUrls ?? [],
    };

    const res = await this.requestWithRetry('POST', '/api/facebook/automate', body);

    const json = (await res.json()) as {
      ok?: boolean;
      operationId?: string;
      postUrl?: string | null;
      dryRun?: boolean;
      error?: string;
    };

    // E9: response ok:false → throw (KHÔNG return fake operationId).
    if (json.ok === false) {
      throw new Error(json.error ?? 'XActions postToFacebook failed — ok:false');
    }
    if (!json.ok) {
      throw new Error('XActions postToFacebook returned no ok flag');
    }

    // AC8 defensive: response dryRun:true (misconfig) → throw.
    if (json.dryRun === true) {
      this.logger.warn(
        { action: 'xactions-post', reason: 'dryRun-true-in-response' },
        'XActions response dryRun=true — refusing (misconfig)',
      );
      throw new Error('XActions response dryRun=true — refusing to accept dry-run post');
    }

    if (!json.operationId) {
      throw new Error('XActions postToFacebook succeeded but no operationId returned');
    }

    // E3: postUrl frequently null/undefined (FB XHR submit, no navigation).
    return {
      ok: true,
      operationId: json.operationId,
      postUrl: json.postUrl ?? null,
    };
  }

  async getOperationStatus(operationId: string): Promise<OperationStatusResult> {
    const res = await this.requestWithRetry(
      'GET',
      `/api/operations/status/${encodeURIComponent(operationId)}`,
      undefined,
    );
    const json = (await res.json()) as { status?: string; result?: unknown; error?: string };
    if (!json.status) {
      throw new Error(`XActions operation ${operationId} returned no status`);
    }
    return { status: json.status, result: json.result, error: json.error };
  }

  /**
   * fetch wrapper: 30s timeout (AbortController), retry 5xx once (simple).
   * 4xx → throw ngay (E2/E12). 401 → message rõ (E12).
   */
  private async requestWithRetry(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.doFetch(url, method, body);

        // 4xx → throw ngay (KHÔNG retry).
        if (res.status >= 400 && res.status < 500) {
          const errText = await res.text().catch(() => '');
          if (res.status === 401) {
            throw new Error('XActions auth failed — check XACTIONS_API_TOKEN');
          }
          throw new Error(
            `XActions ${method} ${path} failed: HTTP ${res.status}${errText ? ` — ${errText}` : ''}`,
          );
        }

        // 5xx → retry once (E4).
        if (res.status >= 500) {
          lastError = new Error(
            `XActions ${method} ${path} failed: HTTP ${res.status}`,
          );
          if (attempt === 0) {
            this.logger.warn(
              { action: 'xactions-request', method, path, status: res.status, attempt, retry: true },
              'XActions 5xx — retrying once',
            );
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          throw lastError;
        }

        return res;
      } catch (e) {
        // AbortError (timeout) → KHÔNG retry, throw ngay (E1).
        if (e instanceof Error && e.name === 'AbortError') {
          throw new Error(`XActions ${method} ${path} timeout after ${TIMEOUT_MS}ms`);
        }
        // Already-thrown 4xx Error → propagate (KHÔNG retry).
        if (e instanceof Error && e.message.startsWith('XActions ')) {
          throw e;
        }
        // Network error → retry once.
        lastError = e;
        if (attempt === 0) {
          this.logger.warn(
            { action: 'xactions-request', method, path, attempt, retry: true, err: e instanceof Error ? e.message : String(e) },
            'XActions network error — retrying once',
          );
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw e;
      }
    }
    throw lastError ?? new Error(`XactionsClient request failed: ${method} ${path}`);
  }

  private async doFetch(url: string, method: 'GET' | 'POST', body: unknown): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        method,
        headers: {
          authorization: `Bearer ${this.token}`,
          'content-type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
