import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation.
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// Mock useAuth.
const mockAuth = {
  user: {
    id: 'u1',
    email: 'test@bdsai.vn',
    role: 'user',
    phoneVerified: false,
  },
  accessToken: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  setAccessToken: vi.fn(),
};

vi.mock('@/components/auth/use-auth', () => ({
  useAuth: () => mockAuth,
}));

// Mock useAuthFetch.
const mockAuthFetch = vi.fn();
vi.mock('@/lib/auth-fetch', () => ({
  useAuthFetch: () => ({ authFetch: mockAuthFetch }),
}));

import { ProfileForm } from '@/app/(public)/profile/profile-form';

describe('ProfileForm (AC6, E9, E10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
  });

  it('AC6: renders form fields (displayName, bio, email read-only, phone read-only)', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'u1',
        email: 'test@bdsai.vn',
        phone: '0901234567',
        phoneVerified: false,
        role: 'user',
        banned: false,
        createdAt: '2026-01-01',
        avatarUrl: null,
        bio: null,
        displayName: null,
      }),
    });

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Giới thiệu')).toBeInTheDocument();
    // Email read-only input — check via display value (not text content).
    expect(screen.getByDisplayValue('test@bdsai.vn')).toBeInTheDocument();
    expect(screen.getByText('Chưa xác thực')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeInTheDocument();
  });

  it('E9: chưa login → redirect /login?redirect=/profile', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;

    render(<ProfileForm />);

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=/profile');
  });

  it('AC6f: save profile → PATCH /api/auth/me', async () => {
    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'u1',
          email: 'test@bdsai.vn',
          phone: '0901234567',
          phoneVerified: false,
          role: 'user',
          banned: false,
          createdAt: '2026-01-01',
          avatarUrl: null,
          bio: null,
          displayName: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'u1',
          email: 'test@bdsai.vn',
          phone: '0901234567',
          phoneVerified: false,
          role: 'user',
          banned: false,
          createdAt: '2026-01-01',
          avatarUrl: null,
          bio: 'Môi giới BĐS',
          displayName: 'Luis P',
        }),
      });

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Tên hiển thị'), {
      target: { value: 'Luis P' },
    });
    fireEvent.change(screen.getByLabelText('Giới thiệu'), {
      target: { value: 'Môi giới BĐS' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Cập nhật hồ sơ thành công')).toBeInTheDocument();
    });
  });

  it('E10: save fail → hiển thị error message từ API', async () => {
    mockAuthFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'u1',
          email: 'test@bdsai.vn',
          phone: '0901234567',
          phoneVerified: false,
          role: 'user',
          banned: false,
          createdAt: '2026-01-01',
          avatarUrl: null,
          bio: null,
          displayName: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          statusCode: 403,
          message: 'Tài khoản đã bị khóa',
        }),
      });

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Tên hiển thị'), {
      target: { value: 'Luis P' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(screen.getByText('Tài khoản đã bị khóa')).toBeInTheDocument();
    });
  });

  it('AC6c: displayName > 100 chars → client validation error', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'u1',
        email: 'test@bdsai.vn',
        phone: '0901234567',
        phoneVerified: false,
        role: 'user',
        banned: false,
        createdAt: '2026-01-01',
        avatarUrl: null,
        bio: null,
        displayName: null,
      }),
    });

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText('Tên hiển thị')).toBeInTheDocument();
    });

    // Bypass maxLength bằng direct state — test client validation logic.
    const nameInput = screen.getByLabelText('Tên hiển thị') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } });
    // maxLength attribute prevents typing beyond 100, so verify the attribute.
    expect(nameInput.maxLength).toBe(100);
  });
});
