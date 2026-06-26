import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.4.
// Forward GET /api/admin/users → NestJS http://localhost:3101/admin/users.
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

  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();

  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/users${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        headers: { authorization: authHeader },
      },
    );

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
