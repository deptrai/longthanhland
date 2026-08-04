# Story 5.8: News Feed BĐS (Admin Curated MVP)

## Metadata
- baseline_commit: TBD
- status: ready-for-dev
- story_id: 5-8-news-feed-bds
- epic: 5
- track: B

## User Story
**As a** visitor on bdsai.vn
**I want** to read BĐS news articles curated by admin
**So that** I stay informed about market trends, regulations, and opportunities

## Context
PRD specifies auto-scrape from FB pages/groups but blocked (XActions API + ToS). MVP: admin manually adds news articles (URL + title + summary + source + category). Public feed page displays them. When auto-scrape is unblocked, the same table + feed UI will be reused.

## Acceptance Criteria

### AC1: news_articles table
- GIVEN DB migration runs
- THEN table `news_articles` exists with: id, title, summary, sourceUrl, sourceName, category, imageUrl, publishedAt, status, createdAt, updatedAt
- AND status enum: 'published' | 'draft' | 'archived'

### AC2: Admin create article endpoint
- GIVEN admin POSTs to /api/admin/news with { title, summary, sourceUrl, sourceName, category, imageUrl?, publishedAt? }
- THEN article is created with status='published' (default) or 'draft'
- AND returns 201 with created article

### AC3: Admin list/update/delete articles
- GET /api/admin/news — list all (paginated)
- PATCH /api/admin/news/:id — update fields
- DELETE /api/admin/news/:id — soft delete (status='archived')

### AC4: Public news feed endpoint
- GET /api/news?page=1&limit=20&category=...
- Returns published articles sorted by publishedAt DESC
- No auth required

### AC5: Public news feed page (web)
- /news page displays articles in card layout
- Each card: title, summary, sourceName, publishedAt, imageUrl (if any), "Đọc thêm" link to sourceUrl
- Category filter tabs (Tất cả, Thị trường, Pháp lý, Dự án, Tài chính)

### AC6: Category support
- Categories: 'thi-truong' (Thị trường), 'phap-ly' (Pháp lý), 'du-an' (Dự án), 'tai-chinh' (Tài chính)
- Filter by category on both API and UI

### AC7: Admin guard on admin endpoints
- Non-admin → 403

### AC8: Pagination
- Default limit=20, max=50
- Response includes { items, total, page, limit }

### AC9: Tests
- news.service.spec.ts — CRUD, pagination, category filter
- news.controller.spec.ts — endpoints, guard

### AC10: Web news page
- /news route with category tabs
- Card layout matching existing patterns
- Loading + empty states

## Invariant AD Table
| AD | Compliance |
|----|-----------|
| AD-1 Module Isolation | NewsModule separate |
| AD-2 Single Mutation Path | All mutations qua NewsService |

## Edge Cases
- E1: No articles → empty state "Chưa có tin tức"
- E2: Invalid category → 400
- E3: sourceUrl invalid → 400
- E4: publishedAt in future → allowed (scheduled)
- E5: imageUrl null → no image shown

## Dev Notes
- No new dependencies
- Reuse existing patterns: useAuthFetch, card layout, API proxy
- News page is public (no auth) — like /listings
