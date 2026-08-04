import { NextResponse } from 'next/server';

// Story 5.6: Next API thin proxy (AD-10).
// PATCH /api/xaction/cross-posts/[id] → NestJS /xaction/cross-posts/:id (confirm assisted).
// DELETE /api/xaction/cross-posts/[id] → NestJS /xaction/cross-posts/:id (remove).

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function PATCH(
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
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { statusCode: 400, message: 'Thiếu dữ liệu', error: 'Bad Request' },
      { status: 400 },
    );
  }
  try {
    const res = await fetch(`${API_BASE_URL}/xaction/cross-posts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: authHeader },
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authHeader = _request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}/xaction/cross-posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { authorization: authHeader },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { statusCode: 503, message: 'API không khả dụng', error: 'Service Unavailable' },
      { status: 503 },
    );
  }
}
