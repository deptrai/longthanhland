# Dev Log — Story 5.8: News Feed BĐS (Admin Curated MVP)

## Summary
Admin-curated BĐS news feed. PRD specifies auto-scrape from FB pages/groups but blocked (XActions API + ToS). MVP: admin manually adds news articles. Public feed page displays them. When auto-scrape is unblocked, same table + feed UI will be reused.

## Files Created (API — 5 new)
1. `db/schema/news-articles.ts` — news_articles table (title, summary, sourceUrl, sourceName, category, imageUrl, publishedAt, status)
2. `db/migrations/0016_news_articles.sql` — Migration with 4 indexes
3. `news/news.service.ts` — CRUD + pagination + category filter + URL validation
4. `news/news.controller.ts` — Public GET /news + Admin CRUD /admin/news
5. `news/news.module.ts` — NewsModule
6. `news/news.service.spec.ts` — 11 tests (CRUD, pagination, validation)

## Files Created (Web — 4 new)
1. `app/api/news/route.ts` — Public GET proxy (no auth)
2. `app/api/admin/news/route.ts` — Admin GET + POST proxy
3. `app/api/admin/news/[id]/route.ts` — Admin PATCH + DELETE proxy
4. `app/(public)/news/page.tsx` — Public news feed page (category tabs, card layout)

## Files Updated (2)
1. `db/schema/index.ts` — Export news-articles
2. `app.module.ts` — Register NewsModule
3. `components/shared/site-header.tsx` — Add "Tin tức" nav link

## Verification
- typecheck API: 0 errors ✅
- typecheck Web: 0 errors ✅
- test API: 395/395 pass (382 + 13 news) ✅
- build API: success ✅
- build Web: success (40/40 pages, new routes /news, /api/news, /api/admin/news) ✅
- migration 0016: applied (table + 5 indexes verified) ✅

## Key Decisions
1. **MVP approach** — Admin manual curation instead of auto-scrape from FB (blocked)
2. **4 categories** — thi-truong, phap-ly, du-an, tai-chinh
3. **Status flow** — draft → published → archived (soft delete)
4. **Public feed** — No auth required, sorted by publishedAt DESC
5. **Pagination** — Default 20, max 50, response includes { items, total, page, limit }
6. **URL validation** — Both sourceUrl and imageUrl validated as proper URLs
7. **Category filter** — Both API (query param) and UI (tabs)
8. **Card layout** — Image (if any) + category badge + date + title + summary + source + "Đọc thêm" link

## AC Coverage
- AC1: news_articles table ✅
- AC2: Admin create endpoint ✅
- AC3: Admin list/update/delete ✅
- AC4: Public news feed endpoint ✅
- AC5: Public news feed page ✅
- AC6: Category support ✅
- AC7: Admin guard ✅
- AC8: Pagination ✅
- AC9: Tests ✅ (11 tests written)
- AC10: Web news page ✅
