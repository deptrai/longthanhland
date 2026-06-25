import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.2.
// Forward POST /api/auth/logout → NestJS http://localhost:3101/auth/logout.
// Pass-through Authorization header + Set-Cookie clear.
// ZERO business logic trong web.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');

  try {
    const headers: Record<string, string> = {};
    if (authHeader) headers['authorization'] = authHeader;

    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers,
    });

    const data = await res.json();
    // Pass-through Set-Cookie clear (Max-Age=0).
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
