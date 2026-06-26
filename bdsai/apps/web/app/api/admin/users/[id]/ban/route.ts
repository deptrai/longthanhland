import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.4.
// Forward POST /api/admin/users/:id/ban → NestJS /admin/users/:id/ban.
// Pass-through Authorization header. ZERO business logic trong web.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/users/${id}/ban`, {
      method: 'POST',
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
