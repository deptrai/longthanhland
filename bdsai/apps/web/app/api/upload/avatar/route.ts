import { NextResponse } from 'next/server';

// Next API thin proxy (AD-10) — Story 2.3.
// Forward POST /api/upload/avatar → NestJS http://localhost:3101/upload/avatar.
// Pass-through multipart/form-data + Authorization header. ZERO business logic.
// Validation nghiệp vụ (file type, size, sharp WebP convert) ở NestJS.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { statusCode: 401, message: 'Thiếu token xác thực', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Forward multipart FormData nguyên dạng (KHÔNG parse — pass-through).
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { statusCode: 400, message: 'Thiếu file', error: 'Bad Request' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      // KHÔNG set Content-Type — fetch tự set boundary cho FormData.
      headers: { authorization: authHeader },
      body: formData,
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
