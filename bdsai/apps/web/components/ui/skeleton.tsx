import type * as React from 'react';

import { cn } from '@/lib/utils';

// shadcn/ui Skeleton — pure CSS animate-pulse (no client JS, SSR-safe per AD-4).
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-primary/10', className)}
      {...props}
    />
  );
}
