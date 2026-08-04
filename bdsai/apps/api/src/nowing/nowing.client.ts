import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

/**
 * NowingClient — Story 7.1a.
 *
 * HTTP client wrapping Nowing engine REST API.
 * Dùng global fetch + AbortController (Node 18+ built-in — KHÔNG thêm axios).
 *
 * Methods:
 *   - health() → GET /health
 *
 * Error handling:
 *   - Timeout 30s → throw NowingEngineError
 *   - 4xx/5xx → throw NowingEngineError với statusCode
 *
 * AD-8: KHÔNG log raw API key.
 */

const TIMEOUT_MS = 30_000;

export class NowingEngineError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'NowingEngineError';
  }
}

export class NowingEngineAuthError extends NowingEngineError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'NowingEngineAuthError';
  }
}

export class NowingEngineConfigError extends NowingEngineError {
  constructor(message: string) {
    super(message);
    this.name = 'NowingEngineConfigError';
  }
}

@Injectable()
export class NowingClient {
  private readonly logger = new Logger(NowingClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.baseUrl = (this.config.get('NOWING_ENGINE_URL', { infer: true }) ?? '').replace(/\/$/, '');
    this.apiKey = this.config.get('NOWING_ENGINE_API_KEY', { infer: true }) ?? '';
  }

  async health(): Promise<{ status: string }> {
    return this.request('GET', '/health');
  }

  async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    this.validateConfig();

    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: method === 'POST' && body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (res.status === 401) {
          throw new NowingEngineAuthError('Invalid API key — check NOWING_ENGINE_API_KEY');
        }
        throw new NowingEngineError(
          `Nowing engine unavailable: HTTP ${res.status}${errText ? ` — ${errText}` : ''}`,
          res.status,
        );
      }

      try {
        return (await res.json()) as T;
      } catch {
        throw new NowingEngineError('Nowing engine returned invalid JSON', res.status);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new NowingEngineError(`Nowing engine request timeout after ${TIMEOUT_MS}ms`);
      }
      if (e instanceof NowingEngineError) {
        throw e;
      }
      throw new NowingEngineError(
        `Nowing engine request failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private validateConfig(): void {
    if (!this.baseUrl) {
      throw new NowingEngineConfigError('NOWING_ENGINE_URL is not configured');
    }
    if (!this.apiKey) {
      throw new NowingEngineConfigError('NOWING_ENGINE_API_KEY is not configured');
    }
  }
}
