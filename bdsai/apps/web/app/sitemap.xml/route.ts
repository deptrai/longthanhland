// Story 6.3 — Dynamic sitemap.xml (PUBLISHED listings + static pages).
// Fetch from API, generate XML, cache 1 hour (revalidate).
// Story 6.5: phân trang khi >1000 listings (fetch multiple pages).

import type { MetadataRoute } from 'next';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';
const SITE_URL = 'https://bdsai.vn';
const STATIC_LASTMOD = '2025-01-01T00:00:00.000Z'; // cố định, không now()

export const revalidate = 3600; // 1 hour cache

export async function GET(): Promise<Response> {
  let listings: Array<{ id: string; updatedAt: string }> = [];
  try {
    // Story 6.5: phân trang — fetch tối đa 5000 listings (10 pages x 500).
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(`${API_BASE_URL}/marketplace/search?limit=500&page=${page}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const data = await res.json();
      const items = data.items ?? [];
      listings = listings.concat(items);
      if (items.length < 500) break; // hết listings
    }
  } catch {
    // Graceful — return static-only sitemap if API fails.
  }

  const staticUrls = [
    { loc: `${SITE_URL}/`, lastmod: STATIC_LASTMOD, changefreq: 'daily' as const, priority: 1.0 },
    { loc: `${SITE_URL}/listings`, lastmod: STATIC_LASTMOD, changefreq: 'daily' as const, priority: 0.9 },
    { loc: `${SITE_URL}/login`, lastmod: STATIC_LASTMOD, changefreq: 'monthly' as const, priority: 0.3 },
    { loc: `${SITE_URL}/register`, lastmod: STATIC_LASTMOD, changefreq: 'monthly' as const, priority: 0.3 },
  ];

  const listingUrls = listings.map((l) => ({
    loc: `${SITE_URL}/listings/${l.id}`,
    lastmod: l.updatedAt,
    changefreq: 'weekly' as const,
    priority: 0.8,
  }));

  const allUrls = [...staticUrls, ...listingUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
