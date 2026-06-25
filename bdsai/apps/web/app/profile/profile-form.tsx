'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/use-auth';
import { useAuthFetch } from '@/lib/auth-fetch';

// ProfileForm (AC6) — Story 2.3.
// Client component: form hiển thị + edit profile + avatar upload.
// Auth protect: !isAuthenticated && !isLoading → redirect /login?redirect=/profile.
// AD-10: submit qua Next API thin proxy (/api/auth/me PATCH, /api/upload/avatar).

interface ProfileData {
  id: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: string;
  banned: boolean;
  createdAt: string;
  avatarUrl: string | null;
  bio: string | null;
  displayName: string | null;
}

const BIO_MAX = 500;
const DISPLAY_NAME_MAX = 100;

export function ProfileForm() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { authFetch } = useAuthFetch();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AC6b: auth protect — redirect /login nếu chưa login (sau khi load xong).
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  // AC6d: load profile fresh từ /api/auth/me (AuthContext user có thể stale).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await authFetch('/api/auth/me');
        if (!res.ok) return;
        const data = (await res.json()) as ProfileData;
        if (cancelled) return;
        setProfile(data);
        setDisplayName(data.displayName ?? '');
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatarUrl);
      } catch {
        // network error — ignore
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authFetch]);

  // AC6e: avatar upload — chọn ảnh → upload ngay (KHÔNG đợi save profile).
  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authFetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });
      const body = (await res.json()) as { avatarUrl?: string; message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Tải ảnh thất bại, thử lại sau');
        return;
      }
      if (body.avatarUrl) {
        // R6: cache-bust query param (CDN stale sau upsert).
        setAvatarUrl(`${body.avatarUrl}?v=${Date.now()}`);
        setSuccess('Tải ảnh thành công');
      }
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // AC6f: save profile — PATCH /api/auth/me { displayName, bio, avatarUrl }.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side UX validation (AD-10 — server validation là source of truth).
    if (displayName.length > DISPLAY_NAME_MAX) {
      setError(`Tên hiển thị tối đa ${DISPLAY_NAME_MAX} ký tự`);
      return;
    }
    if (bio.length > BIO_MAX) {
      setError(`Giới thiệu tối đa ${BIO_MAX} ký tự`);
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, bio, avatarUrl }),
      });
      const body = (await res.json()) as { message?: string } & Partial<ProfileData>;
      if (!res.ok) {
        // E10: hiển thị error message từ API.
        setError(body.message ?? 'Cập nhật thất bại, thử lại');
        return;
      }
      // AC6g: success → toast + refresh profile.
      setSuccess('Cập nhật hồ sơ thành công');
      if (body.displayName !== undefined) setDisplayName(body.displayName ?? '');
      if (body.bio !== undefined) setBio(body.bio ?? '');
      if (body.avatarUrl !== undefined) setAvatarUrl(body.avatarUrl);
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setSaving(false);
    }
  }

  // Loading state (tránh flash — AC6b).
  if (isLoading || loadingProfile) {
    return (
      <div className="flex items-center justify-center py-12" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-3 text-sm text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect đã trigger trong useEffect — render null tránh flash.
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
        >
          {success}
        </div>
      )}

      {/* Avatar (AC6c/e) — circular preview 128px + nút "Tải ảnh" */}
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Ảnh đại diện"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
              {displayName.charAt(0).toUpperCase() || (user?.email?.charAt(0).toUpperCase() ?? '?')}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="avatar-file"
            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Tải ảnh
          </label>
          <input
            id="avatar-file"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="sr-only"
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, GIF. Tối đa 10MB.
          </p>
        </div>
      </div>

      {/* Email (read-only — AC3 whitelist) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input
          type="email"
          value={profile?.email ?? user?.email ?? ''}
          readOnly
          aria-readonly="true"
          className="min-h-[44px] rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
      </div>

      {/* Phone (read-only + badge verified/chưa — AC6c) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Số điện thoại</label>
        <div className="flex items-center gap-2">
          <input
            type="tel"
            value={profile?.phone ?? ''}
            readOnly
            aria-readonly="true"
            className="min-h-[44px] flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              profile?.phoneVerified
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {profile?.phoneVerified ? 'Đã xác thực' : 'Chưa xác thực'}
          </span>
        </div>
      </div>

      {/* DisplayName (editable — AC6c) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium text-foreground">
          Tên hiển thị
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={DISPLAY_NAME_MAX}
          className="min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          {displayName.length}/{DISPLAY_NAME_MAX} ký tự
        </p>
      </div>

      {/* Bio (textarea + char counter — AC6c) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-foreground">
          Giới thiệu
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          rows={4}
          className="min-h-[88px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">{bio.length}/{BIO_MAX} ký tự</p>
      </div>

      {/* Save button (AC6f) */}
      <button
        type="submit"
        disabled={saving || uploading}
        className="min-h-[44px] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </form>
  );
}
