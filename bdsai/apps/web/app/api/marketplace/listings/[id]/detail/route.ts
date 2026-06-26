import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next API thin proxy (AD-10) — Story 3.4.
// Forward GET /api/marketplace/listings/:id/detail → NestJS /marketplace/listings/:id.
// Public access for PUBLISHED listings (no auth required for SSR).
// ZERO business logic.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const authHeader = request.headers.get('authorization') ?? '';
  try {
    const headers: Record<string, string> = {};
    if (authHeader) headers['authorization'] = authHeader;
    const res = await fetch(`${API_BASE_URL}/marketplace/listings/${id}/detail`, {
      method: 'GET',
      headers,
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
