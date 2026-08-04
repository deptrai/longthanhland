import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

describe('UsersTable rendering (AC6)', () => {
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

  it('AC6: render table với data từ API', async () => {
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

    render(<UsersTable />);

    await waitFor(() => {
      expect(screen.getByText('user1@bdsai.vn')).toBeInTheDocument();
    });
    expect(screen.getByText('0901111111')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Khóa user1/ })).toBeInTheDocument();
  });

  it('E10: chưa login → redirect /login?redirect=/admin/users', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading = false;

    render(<UsersTable />);

    expect(mockReplace).toHaveBeenCalledWith('/login?redirect=/admin/users');
  });

  it('E11: user thường (role=user) → redirect /', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
    mockAuth.user = {
      id: 'u1',
      email: 'user@bdsai.vn',
      role: 'user',
      phoneVerified: false,
    };

    render(<UsersTable />);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('AC6h: API error → hiển thị message', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ statusCode: 403, message: 'Không có quyền truy cập' }),
    });

    render(<UsersTable />);

    await waitFor(() => {
      expect(screen.getByText('Không có quyền truy cập')).toBeInTheDocument();
    });
  });
});
