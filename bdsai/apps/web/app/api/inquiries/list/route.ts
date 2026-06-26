import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next API thin proxy (AD-10) — Story 6.2.
// Forward GET /api/inquiries → NestJS (seller list own inquiries, JWT required).

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }
  try {
    const res = await fetch(`${API_BASE_URL}/inquiries`, {
      headers: { authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { statusCode: 503, message: 'API không khả dụng', error: 'Service Unavailable' },
      { status: 503 },
    );
  }
}
