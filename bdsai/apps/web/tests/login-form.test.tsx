import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// Mock @bdsai/shared loginSchema.
vi.mock('@bdsai/shared', () => ({
  loginSchema: {
    safeParse: (data: { email: string; password: string }) => {
      if (!data.email || !data.email.includes('@')) {
        return {
          success: false,
          error: { issues: [{ path: ['email'], message: 'Email không hợp lệ' }] },
        };
      }
      if (!data.password) {
        return {
          success: false,
          error: { issues: [{ path: ['password'], message: 'Mật khẩu là bắt buộc' }] },
        };
      }
      return { success: true, data };
    },
  },
}));

// Mock useAuth.
const mockLogin = vi.fn();
vi.mock('@/components/auth/use-auth', () => ({
  useAuth: () => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    logout: vi.fn(),
    setAccessToken: vi.fn(),
  }),
}));

import { LoginForm } from '@/app/(auth)/login/login-form';

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders email + password fields + submit button', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('renders link to /register', () => {
    render(<LoginForm />);
    const link = screen.getByText('Đăng ký');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/register');
  });

  it('shows validation error for invalid email', async () => {
    render(<LoginForm />);
    const form = document.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLElement);
    await waitFor(() => {
      expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
    });
  });

  it('submits and calls /api/auth/login on valid input', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        user: { id: 'u1', email: 'test@bdsai.vn', role: 'user', phoneVerified: false },
      }),
    });

    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mật khẩu');
    fireEvent.change(emailInput, { target: { value: 'test@bdsai.vn' } });
    fireEvent.change(passwordInput, { target: { value: 'Abc12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
      }));
    });
    expect(mockLogin).toHaveBeenCalledWith('test-token', {
      id: 'u1',
      email: 'test@bdsai.vn',
      role: 'user',
      phoneVerified: false,
    });
  });

  it('shows API error on 401', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        statusCode: 401,
        message: 'Email hoặc mật khẩu không đúng',
      }),
    });

    render(<LoginForm />);
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mật khẩu');
    fireEvent.change(emailInput, { target: { value: 'test@bdsai.vn' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(screen.getByText('Email hoặc mật khẩu không đúng')).toBeInTheDocument();
    });
  });
});
