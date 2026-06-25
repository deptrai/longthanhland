import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.2.
// Forward POST /api/auth/login → NestJS http://localhost:3101/auth/login.
// Pass-through Set-Cookie header (refresh_token httpOnly từ NestJS).
// ZERO business logic trong web.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { statusCode: 400, message: 'Body JSON không hợp lệ', error: 'Bad Request' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    // Pass-through Set-Cookie header (refresh_token httpOnly từ NestJS).
    const setCookie = res.headers.get('set-cookie');
    const response = NextResponse.json(data, { status: res.status });
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }
    return response;
  } catch {
    // E11: network error — NestJS unreachable.
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
