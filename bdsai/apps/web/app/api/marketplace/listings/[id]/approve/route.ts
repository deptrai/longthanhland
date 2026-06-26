import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next API thin proxy (AD-10) — Story 3.5.
// Forward POST /api/marketplace/listings/:id/approve → NestJS (admin PENDING → PUBLISHED + audit log).

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(
  request: NextRequest,
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
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  try {
    const res = await fetch(`${API_BASE_URL}/marketplace/listings/${id}/approve`, {
      method: 'POST',
      headers: { authorization: authHeader, 'content-type': 'application/json' },
      body: JSON.stringify(body),
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
