import { NextResponse } from 'next/server';

// Story 5.8: Next API thin proxy — admin news item PATCH/DELETE.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ statusCode: 401, message: 'Thiếu token', error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ statusCode: 400, message: 'Thiếu dữ liệu', error: 'Bad Request' }, { status: 400 });
  }
  try {
    const res = await fetch(`${API_BASE_URL}/admin/news/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: authHeader },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ statusCode: 503, message: 'API không khả dụng', error: 'Service Unavailable' }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ statusCode: 401, message: 'Thiếu token', error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}/admin/news/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { authorization: authHeader },
    });
    return NextResponse.json({}, { status: res.status });
  } catch {
    return NextResponse.json({ statusCode: 503, message: 'API không khả dụng', error: 'Service Unavailable' }, { status: 503 });
  }
}
