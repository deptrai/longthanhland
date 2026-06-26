// Story 6.3 — Dynamic sitemap.xml (PUBLISHED listings + static pages).
// Fetch from API, generate XML, cache 1 hour (revalidate).

import type { MetadataRoute } from 'next';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const revalidate = 3600; // 1 hour cache

export async function GET(): Promise<Response> {
  let listings: Array<{ id: string; updatedAt: string }> = [];
  try {
    const res = await fetch(`${API_BASE_URL}/marketplace/search?limit=1000`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      listings = data.items ?? [];
    }
  } catch {
    // Graceful — return static-only sitemap if API fails.
  }

  const staticUrls = [
    { loc: 'https://bdsai.vn/', lastmod: new Date().toISOString(), changefreq: 'daily' as const, priority: 1.0 },
    { loc: 'https://bdsai.vn/marketplace', lastmod: new Date().toISOString(), changefreq: 'daily' as const, priority: 0.9 },
  ];

  const listingUrls = listings.map((l) => ({
    loc: `https://bdsai.vn/listings/${l.id}`,
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
