'use client';

import { useState } from 'react';

// InquiryForm — Story 6.1.
// Buyer gửi tin nhắn cho seller (public, không cần login).
// POST /api/inquiries (thin proxy → NestJS).

interface InquiryFormProps {
  listingId: string;
}

export function InquiryForm({ listingId }: InquiryFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingId,
          buyerName: buyerName.trim(),
          buyerPhone: buyerPhone.trim(),
          buyerEmail: buyerEmail.trim() || undefined,
          message: message.trim(),
        }),
      });
      const body = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Gửi liên hệ thất bại');
        return;
      }
      setSuccess(true);
      setBuyerName('');
      setBuyerPhone('');
      setBuyerEmail('');
      setMessage('');
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-800">Đã gửi liên hệ thành công!</p>
        <p className="mt-2 text-sm text-green-700">
          Người bán sẽ liên hệ với bạn sớm. Cảm ơn bạn đã quan tâm.
        </p>
        <button
          type="button"
          onClick={() => {
            setSuccess(false);
            setOpen(false);
          }}
          className="mt-3 min-h-[44px] rounded-md border border-green-500/50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/10"
        >
          Đóng
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-8 rounded-lg bg-blue-50 p-6 text-center">
        <p className="text-lg font-semibold text-blue-900">Quan tâm tin này?</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 min-h-[44px] rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Liên hệ người bán
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h2 className="text-lg font-semibold text-blue-900">Liên hệ người bán</h2>
      {error && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-500/50 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div>
          <label htmlFor="buyerName" className="block text-sm font-medium text-gray-700">
            Họ tên *
          </label>
          <input
            id="buyerName"
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="Nguyễn Văn A"
            className="mt-1 block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="buyerPhone" className="block text-sm font-medium text-gray-700">
            Số điện thoại *
          </label>
          <input
            id="buyerPhone"
            type="tel"
            required
            pattern="0\d{9,10}"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="0901234567"
            className="mt-1 block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="buyerEmail" className="block text-sm font-medium text-gray-700">
            Email (tùy chọn)
          </label>
          <input
            id="buyerEmail"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="email@example.com"
            className="mt-1 block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Tin nhắn *
          </label>
          <textarea
            id="message"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tôi quan tâm tin này, vui lòng liên hệ..."
            className="mt-1 block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-[44px] flex-1 rounded-md border border-input bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi liên hệ'}
          </button>
        </div>
      </form>
    </div>
  );
}
