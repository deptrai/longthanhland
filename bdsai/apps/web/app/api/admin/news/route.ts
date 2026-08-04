import { NextResponse } from 'next/server';

// Story 5.8: Next API thin proxy (AD-10) — admin news CRUD.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ statusCode: 401, message: 'Thiếu token', error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') ?? '1';
  const limit = searchParams.get('limit') ?? '20';
  try {
    const res = await fetch(`${API_BASE_URL}/admin/news?page=${page}&limit=${limit}`, {
      headers: { authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ statusCode: 503, message: 'API không khả dụng', error: 'Service Unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ statusCode: 401, message: 'Thiếu token', error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ statusCode: 400, message: 'Thiếu dữ liệu', error: 'Bad Request' }, { status: 400 });
  }
  try {
    const res = await fetch(`${API_BASE_URL}/admin/news`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: authHeader },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ statusCode: 503, message: 'API không khả dụng', error: 'Service Unavailable' }, { status: 503 });
  }
}
