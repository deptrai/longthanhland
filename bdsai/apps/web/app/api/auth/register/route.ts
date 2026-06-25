import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.1.
// Forward POST /api/auth/register → NestJS http://localhost:3101/auth/register.
// ZERO business logic trong web — validation nghiệp vụ ở NestJS (source of truth).
// Client form validation chỉ UX (Zod duplicate, AD-1).

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
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // E8: network error — NestJS unreachable.
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
