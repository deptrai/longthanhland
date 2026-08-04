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

// Helper: mock a single-row list API response.
const mockListResponse = (user: Record<string, unknown>) => ({
  ok: true,
  json: async () => ({
    data: [user],
    total: 1,
    page: 1,
    limit: 20,
  }),
});

const mockUser = (
  id: string,
  email: string,
  phone: string,
  role: string,
  banned = false,
) => ({
  id,
  email,
  phone,
  role,
  banned,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('UsersTable role management + search + pagination', () => {
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

  it('AC6d: search submit → gọi API với search param', async () => {
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, limit: 20 }),
    });

    render(<UsersTable />);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalled();
    });

    mockAuthFetch.mockClear();
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, limit: 20 }),
    });

    const input = screen.getByLabelText('Tìm kiếm người dùng');
    fireEvent.change(input, { target: { value: 'test@' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test%40'),
      );
    });
  });

  // --- Story 2.5: role grant/revoke button ---

  it('AC5: user row → hiển thị button "Cấp admin"', async () => {
    mockAuthFetch.mockResolvedValueOnce(
      mockListResponse(mockUser('u1', 'user1@bdsai.vn', '0901111111', 'user')),
    );

    render(<UsersTable />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Cấp admin user1/ }),
      ).toBeInTheDocument();
    });
  });

  it('AC5: admin row (không phải self) → hiển thị button "Thu hồi admin"', async () => {
    mockAuthFetch.mockResolvedValueOnce(
      mockListResponse(mockUser('admin-2', 'admin2@bdsai.vn', '0902222222', 'admin')),
    );

    render(<UsersTable />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Thu hồi admin admin2/ }),
      ).toBeInTheDocument();
    });
  });

  it('AC5d: self row (admin) → button "Thu hồi admin" disabled (self-revoke block)', async () => {
    // mockAuth.user.id = 'admin-1' (default). Row id = 'admin-1' → self.
    mockAuthFetch.mockResolvedValueOnce(
      mockListResponse(mockUser('admin-1', 'admin@bdsai.vn', '0901111111', 'admin')),
    );

    render(<UsersTable />);

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Thu hồi admin admin@bdsai/ });
      expect(btn).toBeDisabled();
    });
  });

  it('AC5b: click "Cấp admin" → confirm dialog → role API call + toast', async () => {
    mockAuthFetch.mockResolvedValueOnce(
      mockListResponse(mockUser('u1', 'user1@bdsai.vn', '0901111111', 'user')),
    );
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'u1', role: 'admin' }),
    });

    render(<UsersTable />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Cấp admin user1/ }),
      ).toBeInTheDocument();
    });

    // Click "Cấp admin" → confirm dialog.
    fireEvent.click(screen.getByRole('button', { name: /Cấp admin user1/ }));

    await waitFor(() => {
      expect(screen.getByText('Xác nhận cấp quyền quản trị viên')).toBeInTheDocument();
    });

    // Click confirm "Cấp admin" button in dialog.
    const dialogButtons = screen.getAllByRole('button', { name: 'Cấp admin' });
    const confirmButton = dialogButtons.find((btn) => btn.closest('[role="dialog"]'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/admin/users/u1/role', {
        method: 'POST',
        body: JSON.stringify({ role: 'admin' }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Đã cấp quyền quản trị viên')).toBeInTheDocument();
    });
  });

  it('AC5c: click "Thu hồi admin" → confirm dialog → role API call + toast', async () => {
    mockAuthFetch.mockResolvedValueOnce(
      mockListResponse(mockUser('admin-2', 'admin2@bdsai.vn', '0902222222', 'admin')),
    );
    mockAuthFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'admin-2', role: 'user' }),
    });

    render(<UsersTable />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Thu hồi admin admin2/ }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Thu hồi admin admin2/ }));

    await waitFor(() => {
      expect(screen.getByText('Xác nhận thu hồi quyền quản trị viên')).toBeInTheDocument();
    });

    // Click confirm "Thu hồi" button in dialog.
    const dialogButtons = screen.getAllByRole('button', { name: 'Thu hồi' });
    const confirmButton = dialogButtons.find((btn) => btn.closest('[role="dialog"]'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/admin/users/admin-2/role', {
        method: 'POST',
        body: JSON.stringify({ role: 'user' }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Đã thu hồi quyền quản trị viên')).toBeInTheDocument();
    });
  });

  it('AC5f: role API error (400 self-revoke) → hiển thị message', async () => {
    mockAuthFetch.mockResolvedValueOnce(
      mockListResponse(mockUser('admin-2', 'admin2@bdsai.vn', '0902222222', 'admin')),
    );
    mockAuthFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        statusCode: 400,
        message: 'Không thể thu hồi vai trò của chính mình',
      }),
    });

    render(<UsersTable />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Thu hồi admin admin2/ }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Thu hồi admin admin2/ }));

    await waitFor(() => {
      expect(screen.getByText('Xác nhận thu hồi quyền quản trị viên')).toBeInTheDocument();
    });

    const dialogButtons = screen.getAllByRole('button', { name: 'Thu hồi' });
    const confirmButton = dialogButtons.find((btn) => btn.closest('[role="dialog"]'));
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(
        screen.getByText('Không thể thu hồi vai trò của chính mình'),
      ).toBeInTheDocument();
    });
  });
});
