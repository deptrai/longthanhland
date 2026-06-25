import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SiteHeader } from '@/components/shared/site-header';

describe('SiteHeader', () => {
  it('renders logo "bdsai.vn" as link to /', () => {
    render(<SiteHeader />);
    const logo = screen.getByRole('link', { name: 'bdsai.vn' });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('href', '/');
  });

  it('renders nav links Trang chủ, Tìm kiếm, Đăng tin', () => {
    render(<SiteHeader />);
    expect(screen.getByText('Trang chủ')).toBeInTheDocument();
    expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();
    // "Đăng tin" xuất hiện ở nav desktop + nút + mobile — dùng getAllByText
    expect(screen.getAllByText('Đăng tin').length).toBeGreaterThan(0);
  });

  it('renders Đăng nhập link', () => {
    render(<SiteHeader />);
    expect(screen.getByText('Đăng nhập')).toBeInTheDocument();
  });

  it('renders hamburger button with aria-label Mở menu (mobile)', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('button', { name: 'Mở menu' })).toBeInTheDocument();
  });
});
