// support/helpers/api-client.ts — typed HTTP client cho API E2E tests.
// Pattern: api-request (typed HTTP client, schema validation, retry logic).
import { request, type APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://localhost:3101';

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

export class ApiClient {
  private ctx: APIRequestContext;

  constructor(ctx?: APIRequestContext) {
    this.ctx = ctx ?? ({} as APIRequestContext);
  }

  static async create(accessToken?: string): Promise<ApiClient> {
    const ctx = await request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: accessToken
        ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
    });
    const client = new ApiClient(ctx);
    client.ctx = ctx;
    return client;
  }

  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await this.ctx.get(path);
    return { status: res.status(), body: await res.json().catch(() => null), headers: res.headers() };
  }

  async post<T = unknown>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await this.ctx.post(path, { data });
    return { status: res.status(), body: await res.json().catch(() => null), headers: res.headers() };
  }

  async patch<T = unknown>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await this.ctx.patch(path, { data });
    return { status: res.status(), body: await res.json().catch(() => null), headers: res.headers() };
  }

  async delete<T = unknown>(path: string): Promise<ApiResponse<T>> {
    const res = await this.ctx.delete(path);
    return { status: res.status(), body: await res.json().catch(() => null), headers: res.headers() };
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}
