---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics]
inputDocuments: [_bmad-output/planning-artifacts/PRD-marketplace-mvp-v2.md, _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md]
---

# bdsai.vn - Epic Breakdown

## Overview

Tài liệu này phân tách requirements từ PRD v2.0 và Architecture Spine thành 6 epics với stories chi tiết cho dự án bdsai.vn — Sàn Rao Vặt Bất Động Sản AI MVP.

## Requirements Inventory

### Functional Requirements

FR1: User đăng ký bằng email + phone, xác thực qua Supabase Auth
FR2: User đăng nhập, quản lý profile (avatar, bio, phone verified)
FR3: Seller tạo listing (multi-step form, image upload, draft/publish)
FR4: Admin approve/reject listings từ moderation queue
FR5: Buyer browse + search listings (filters: location, price, type, area)
FR6: Listing detail page SSR với dynamic meta tags + structured data
FR7: AI Summary: GPT-4 phân tích mỗi listing (highlights, neighborhood, investment)
FR8: Trust Score: algorithm chấm điểm uy tín (0-100)
FR9: Smart Spam Filter: rule-based + keyword blacklist
FR10: Xaction Auto-Post: seller chọn platforms → BullMQ job → Xaction API post dưới proxy
FR11: Xaction Auto-Import: crawl listings từ BDS/Chợ Tốt/FB → imported_listings DB
FR12: Seller dashboard: xem link bài đã quảng bá, trạng thái cross-posts
FR13: Import dashboard (admin): review/approve/reject crawled listings
FR14: Inquiry form: buyer gửi liên hệ cho seller
FR15: Notification: email + SMS cho seller khi có inquiry
FR16: Listing auto-expire + renew + mark sold
FR17: News feed: tin tức BĐS từ Facebook pages/groups (via Xaction)
FR18: Dynamic sitemap.xml + robots.txt
FR19: Admin: user list, ban/unban

### NonFunctional Requirements

NFR1: SSR render < 500ms (P95)
NFR2: API response < 200ms (P95)
NFR3: Lighthouse SEO > 90
NFR4: Page load < 2s (P75)
NFR5: Supabase Free tier limits: 500MB DB, 1GB storage
NFR6: AI rate limit: max 100 calls/hour
NFR7: Xaction retry: 3x exponential backoff, never block user
NFR8: Vietnamese full-text search support
NFR9: Image max 10MB, auto-convert WebP
NFR10: Domain: bdsai.vn

### Additional Requirements

- Monorepo: apps/web + apps/api + packages/shared (Turborepo)
- Deploy: Vercel (FE) + Dokploy Docker (BE)
- CI/CD: GitHub Actions
- All mutations through NestJS API (AD-2)
- Xaction calls always async via BullMQ (AD-3)
- Auth: Supabase Auth (public) + NestJS guards (admin) (AD-5)
- Error tracking: Sentry
- Module isolation: marketplace, auth, ai, xaction, admin, queue (AD-1)

### UX Design Requirements

Không có UX spec riêng. UI sẽ sử dụng shadcn/ui + Tailwind CSS, responsive mobile-first.

### FR Coverage Map

| FR | Epic | Mô tả |
|---|---|---|
| FR1 | Epic 2 | Đăng ký email + phone |
| FR2 | Epic 2 | Đăng nhập, profile |
| FR3 | Epic 3 | Tạo listing |
| FR4 | Epic 3 | Admin approve/reject |
| FR5 | Epic 3 | Browse + search |
| FR6 | Epic 3 | Listing detail SSR |
| FR7 | Epic 4 | AI Summary |
| FR8 | Epic 4 | Trust Score |
| FR9 | Epic 3 | Spam Filter |
| FR10 | Epic 5 | Xaction Auto-Post |
| FR11 | Epic 5 | Xaction Auto-Import |
| FR12 | Epic 5 | Seller promotion dashboard |
| FR13 | Epic 5 | Import dashboard admin |
| FR14 | Epic 6 | Inquiry form |
| FR15 | Epic 6 | Notifications |
| FR16 | Epic 3 | Auto-expire/renew/sold |
| FR17 | Epic 5 | News feed BĐS |
| FR18 | Epic 6 | Sitemap + robots.txt |
| FR19 | Epic 2 | Admin user management |

## Epic List

### Epic 1: Foundation & Infrastructure
Team dev có môi trường làm việc, app chạy được, deploy tự động.
**FRs covered:** Infrastructure (enables all)

### Epic 2: User Authentication & Profiles
Users đăng ký, đăng nhập, quản lý profile — cả public và admin.
**FRs covered:** FR1, FR2, FR19

### Epic 3: Listing Management & Search
Sellers đăng tin, buyers tìm kiếm và xem chi tiết, admin duyệt tin.
**FRs covered:** FR3, FR4, FR5, FR6, FR9, FR16

### Epic 4: AI Intelligence
Mỗi listing có AI summary + trust score, giúp buyer đánh giá nhanh.
**FRs covered:** FR7, FR8

### Epic 5: Xaction — Quảng bá & Import đa kênh
Seller quảng bá tin lên FB/BDS/Chợ Tốt 1-click. Admin xem listings được import tự động.
**FRs covered:** FR10, FR11, FR12, FR13, FR17

### Epic 6: Inquiry System & SEO
Buyer liên hệ seller trực tiếp. Google index tốt, traffic organic.
**FRs covered:** FR14, FR15, FR18
