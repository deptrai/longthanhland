import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cho phép Next biên dịch package workspace dùng chung (TS nguồn).
  transpilePackages: ['@bdsai/shared'],
  // Neo workspace root về bdsai/ (repo cha twenty cũng có yarn.lock).
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
  // Redirects cho legacy/deprecated routes → tránh 404 nếu user có bookmark cũ.
  async redirects() {
    return [
      { source: '/my-listings/new', destination: '/dashboard/dang-tin', permanent: false },
      { source: '/marketplace', destination: '/listings', permanent: false },
      { source: '/inquiry', destination: '/about', permanent: false },
      { source: '/dashboard', destination: '/dashboard/my-listings', permanent: false },
    ];
  },
  // Story 6.5: image optimization — WebP/AVIF + responsive sizes.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '**.placehold.co',
      },
    ],
  },
};

// AC4 (Story 1.6): Sentry wrapper — auto-wire sentry.client.config.ts vào
// browser bundle + upload source maps khi có SENTRY_AUTH_TOKEN (CI only).
// E2: SENTRY_DSN empty → client config skip init (graceful, không crash).
export default withSentryConfig(nextConfig, {
  // Chỉ log upload source maps trong CI.
  silent: !process.env['CI'],
  // Upload source maps chỉ khi có authToken (CI). Dev local không upload.
  org: process.env['SENTRY_ORG'],
  project: process.env['SENTRY_PROJECT'],
  authToken: process.env['SENTRY_AUTH_TOKEN'],
  // Source maps: xóa sau upload (không serve công khai) — v10 API.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Tắt telemetry Sentry (KHÔNG gửi usage data).
  telemetry: false,
});
