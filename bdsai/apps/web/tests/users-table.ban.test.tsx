import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation.
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => '/admin/users',
}));

// Mock useAuth (mutable per test).
const mockAuth = {
  user: {
    id: 'admin-1',
    email: 'admin@bdsai.vn',
    role: 'admin',
    phoneVerified: true,
  },
  accessToken: 'admin-token',
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

import { UsersTable } from '@/app/(admin)/admin/users/users-table';

describe('UsersTable ban/unban (E10, E11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
    mockAuth.user = {
      id: 'admin-1',
      email: 'admin@bdsai.vn',
      role: 'admin',
      phoneVerified: true,
    };
  });

  it('AC6f: click Khóa → confirm dialog → ban API call', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'u1',
            email: 'user1@bdsai.vn',
            phone: '0901111111',
            role: 'user',
            banned: false,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    });
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'u1', banned: true }),
    });

    render(<UsersTable />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Khóa user1/ })).toBeInTheDocument();
    });

    // Click Khóa → confirm dialog.
    fireEvent.click(screen.getByRole('button', { name: /Khóa user1/ }));

    await waitFor(() => {
      expect(screen.getByText('Xác nhận khóa tài khoản')).toBeInTheDocument();
    });

    // Click confirm "Khóa" button in dialog.
    const dialogButtons = screen.getAllByRole('button', { name: 'Khóa' });
    const confirmButton = dialogButtons.find((btn) => btn.closest('[role="dialog"]'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/admin/users/u1/ban', {
        method: 'POST',
      });
    });
  });

  it('AC6f: click Mở khóa → unban API call', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'u1',
            email: 'user1@bdsai.vn',
            phone: '0901111111',
            role: 'user',
            banned: true,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    });
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'u1', banned: false }),
    });

    render(<UsersTable />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mở khóa user1/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Mở khóa user1/ }));

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/admin/users/u1/unban', {
        method: 'POST',
      });
    });
  });
});
