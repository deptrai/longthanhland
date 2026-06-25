import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('renders a div with animate-pulse class (pure CSS, SSR-safe)', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div).toBeInTheDocument();
    expect(div.className).toContain('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-48 w-full" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('h-48');
    expect(div.className).toContain('w-full');
  });
});
