import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SiteFooter } from '@/components/shared/site-footer';

describe('SiteFooter', () => {
  it('renders logo "bdsai.vn"', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('link', { name: 'bdsai.vn' })).toBeInTheDocument();
  });

  it('renders tagline "Sàn rao vặt BĐS AI — Việt Nam"', () => {
    render(<SiteFooter />);
    expect(
      screen.getByText('Sàn rao vặt BĐS AI — Việt Nam'),
    ).toBeInTheDocument();
  });

  it('renders footer links Về chúng tôi, Liên hệ, Điều khoản, Bảo mật', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Về chúng tôi')).toBeInTheDocument();
    expect(screen.getByText('Liên hệ')).toBeInTheDocument();
    expect(screen.getByText('Điều khoản')).toBeInTheDocument();
    expect(screen.getByText('Bảo mật')).toBeInTheDocument();
  });

  it('renders copyright "© 2026 bdsai.vn"', () => {
    render(<SiteFooter />);
    expect(screen.getByText('© 2026 bdsai.vn')).toBeInTheDocument();
  });
});
