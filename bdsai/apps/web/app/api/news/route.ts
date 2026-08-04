import { NextResponse } from 'next/server';

// Story 5.8: Next API thin proxy (AD-10).
// GET /api/news → NestJS /news (public, no auth).
// POST /api/admin/news → NestJS /admin/news (admin).
// PATCH /api/admin/news/[id] → NestJS /admin/news/:id.
// DELETE /api/admin/news/[id] → NestJS /admin/news/:id.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '20';
  const category = searchParams.get('category') ?? '';
  const qs = `page=${page}&limit=${limit}${category ? `&category=${category}` : ''}`;
  try {
    const res = await fetch(`${API_BASE_URL}/news?${qs}`, { method: 'GET' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { statusCode: 503, message: 'API không khả dụng', error: 'Service Unavailable' },
      { status: 503 },
    );
  }
}
