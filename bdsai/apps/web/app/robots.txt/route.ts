// Story 6.3 — robots.txt (static, allow index public, block dashboard/admin).

export function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin
Disallow: /api/

Sitemap: https://bdsai.vn/sitemap.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
