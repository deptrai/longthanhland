import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.2.
// Forward POST /api/auth/refresh → NestJS http://localhost:3101/auth/refresh.
// Đọc refresh_token từ cookie (httpOnly) + forward tới NestJS.
// Pass-through Set-Cookie (rotated refresh token).
// ZERO business logic trong web.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(request: Request): Promise<NextResponse> {
  // Đọc refresh_token từ cookie (httpOnly — browser gửi tự động cho same-origin).
  const cookieHeader = request.headers.get('cookie');
  let refreshToken: string | undefined;
  if (cookieHeader) {
    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    if (match) refreshToken = match[1];
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // Forward cookie tới NestJS (NestJS đọc từ cookie-parser).
    if (cookieHeader) headers['cookie'] = cookieHeader;

    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers,
      body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : '{}',
    });

    const data = await res.json();
    // Pass-through Set-Cookie (rotated refresh token).
    const setCookie = res.headers.get('set-cookie');
    const response = NextResponse.json(data, { status: res.status });
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }
    return response;
  } catch {
    return NextResponse.json(
      {
        statusCode: 503,
        message: 'API không khả dụng, thử lại sau',
        error: 'Service Unavailable',
      },
      { status: 503 },
    );
  }
}
