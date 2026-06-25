import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cho phép Next biên dịch package workspace dùng chung (TS nguồn).
  transpilePackages: ['@bdsai/shared'],
  // Neo workspace root về bdsai/ (repo cha twenty cũng có yarn.lock).
  turbopack: {
    root: path.join(__dirname, '..', '..'),
  },
};

export default nextConfig;
