'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// AppealButton — Story 4.4.
// Seller khiếu nại điểm trust score → POST /api/ai/appeals.
// Guest/non-owner: ẩn nút.

interface AppealButtonProps {
  listingId: string;
}

export function AppealButton({ listingId }: AppealButtonProps) {
  const { isAuthenticated } = useAuth();
  const { authFetch } = useAuthFetch();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await authFetch('/api/ai/appeals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ listingId, reason: reason.trim() }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Gửi khiếu nại thất bại');
        return;
      }
      setSuccess(true);
      setReason('');
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <p className="mt-2 text-xs text-green-600">
        Đã gửi khiếu nại. Admin sẽ xem xét và phản hồi.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs text-purple-600 underline hover:text-purple-800"
        onClick={() => setOpen(true)}
      >
        Khiếu nại điểm AI
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-purple-200 bg-purple-50 p-3">
      {error && (
        <p className="mb-2 text-xs text-red-600" role="alert">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          required
          minLength={10}
          maxLength={2000}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lý do khiếu nại (tối thiểu 10 ký tự)..."
          className="w-full rounded border border-input px-2 py-1 text-xs"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-input bg-white px-3 py-1 text-xs"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting || reason.trim().length < 10}
            className="rounded bg-purple-600 px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
          </button>
        </div>
      </form>
    </div>
  );
}
