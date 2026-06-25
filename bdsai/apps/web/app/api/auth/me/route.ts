import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.2 + Story 2.3.
// Forward GET/PATCH /api/auth/me → NestJS http://localhost:3101/auth/me.
// Pass-through Authorization header. ZERO business logic trong web.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: { authorization: authHeader },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
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

// Story 2.3 AC7: PATCH /api/auth/me — forward PATCH /auth/me (cập nhật profile).
// AD-10: ZERO business logic — validation nghiệp vụ (whitelist, Zod, sanitize)
// ở NestJS. Web chỉ forward body + Authorization header.
export async function PATCH(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json(
      { statusCode: 400, message: 'Body không hợp lệ', error: 'Bad Request' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', authorization: authHeader },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
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
