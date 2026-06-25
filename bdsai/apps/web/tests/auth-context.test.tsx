import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { useAuth } from '@/components/auth/use-auth';

// Test component that uses useAuth.
function TestConsumer() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">
        {isAuthenticated ? 'authenticated' : 'unauthenticated'}
      </span>
      <span data-testid="loading-state">{isLoading ? 'loading' : 'loaded'}</span>
      <span data-testid="user-email">{user?.email ?? 'none'}</span>
      <button type="button" onClick={() => login('token-1', { id: 'u1', email: 'test@bdsai.vn', role: 'user' })}>
        Login
      </button>
      <button type="button" onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthProvider + useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders children', () => {
    render(
      <AuthProvider>
        <div>child content</div>
      </AuthProvider>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('starts unauthenticated + loading, then loaded after restore fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ statusCode: 401, message: 'Phiên hết hạn' }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    // Initially loading.
    expect(screen.getByTestId('loading-state').textContent).toBe('loading');

    // After restore attempt fails → unauthenticated + loaded.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
    expect(screen.getByTestId('auth-state').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('loading-state').textContent).toBe('loaded');
  });

  it('login() sets authenticated state', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Click login.
    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('test@bdsai.vn');

    // Click logout.
    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('auth-state').textContent).toBe('unauthenticated');
  });
});
