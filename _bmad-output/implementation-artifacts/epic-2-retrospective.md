# Epic 2 Retrospective — User Authentication & Profiles

**Epic:** 2 — User Authentication & Profiles
**Project:** bdsai.vn (sàn BĐS AI Long Thành)
**Date:** 2026-06-26
**Status:** DONE (5/5 story, 43/43 AC)
**Branch:** production

## 1. Epic Review

### Stories completed
| Story | Tên | AC | Review findings | E2e verdict |
|---|---|---|---|---|
| 2.1 | Đăng ký bằng email + phone | 10/10 | 2 medium + 5 low (non-blocking) | PASS (10/10, real Supabase Auth + Mailpit) |
| 2.2 | Đăng nhập/đăng xuất JWT session | 9/9 | 1 HIGH (fixed: logout JWT decode DoS) + 3 medium + 5 low | PASS (9/9, 21/21 test case real data) |
| 2.3 | Quản lý profile (avatar + bio + display_name) | 7/7 | 2 medium + 4 low (non-blocking) | PASS (7/7, browser test profile update) |
| 2.4 | Admin danh sách user ban/unban | 10/10 | 1 medium + 5 low (non-blocking) | PASS (10/10, 27 curl + 14 e2e + browser) |
| 2.5 | Admin role grant (cấp/thu hồi admin) | 8/8 | 0 critical/high (self-review, subagent rate-limited) | PASS (8/8, 72 e2e + curl real data) |

**Tổng:** 43/43 AC thỏa, 0 critical/high còn mở, 5/5 story DONE.

### Hạ tầng/tính năng tạo ra
- **Auth:** Supabase Auth (email + phone register) + JWT ES256 (access 15min + refresh 7day HttpOnly cookie) + logout (JwtAuthGuard) + refresh token rotation
- **Profile:** public_users table (11 cột: id, email, phone, phoneVerified, role, banned, avatarUrl, bio, displayName, createdAt, updatedAt) + GET/PATCH /auth/me + avatar upload (Supabase Storage)
- **Admin:** AdminModule + AdminGuard (query DB check role — AD-5, KHÔNG trust JWT role claim) + GET /admin/users (paginated + search) + POST ban/unban + POST role grant/revoke
- **Web:** /login + /register + /profile + /admin/users page + admin layout (sidebar + guard) + AuthProvider (accessToken in-memory + refresh on 401)
- **Security:** PII redact (pino + Sentry — email/phone/password/token) + rate limit (register 5/h, login 5/15min, admin 20/15min, role grant 10/15min) + JWT blacklist (banned user login → 403) + self-ban/self-revoke block
- **Mailpit:** dev confirmation link log (pino) — admin.createUser không gửi email tự động → log link cho dev confirm manual

### Invariant AD tuân thủ
| AD | Story áp dụng | Verify |
|----|---------------|--------|
| AD-1 (Module Isolation) | AuthModule, AdminModule riêng | PASS — không leak logic |
| AD-2 (Single Data Mutation Path) | Tất cả mutation qua NestJS Service → Drizzle | PASS — frontend KHÔNG update DB trực tiếp |
| AD-5 (Auth Separation) | AdminGuard query DB mỗi request | PASS — role change take effect ngay, KHÔNG trust JWT role |
| AD-7 (Error Shape) | AllExceptionsFilter { statusCode, message, error } | PASS — consistent shape tất cả endpoint |
| AD-8 (PII/secret redact) | pino + Sentry redact email/phone/password/token | PASS — log KHÔNG chứa raw PII |
| AD-10 (Next API Route Boundary) | Next API route chỉ forward tới NestJS | PASS — zero business logic trong Next API |

## 2. What went well
- **Story cycle pipeline (author → dev → review → e2e → commit)** hoạt động tốt — mỗi story hoàn thành trong 1 pass
- **Subagent delegation** hiệu quả cho story-author + story-developer + code-reviewer + e2e-tester (Story 2.3, 2.4)
- **Real-data testing** (Supabase + Redis + API thật, KHÔNG mock) bắt được bug thực tế (JWT decode DoS, Mailpit confirmation link)
- **AdminGuard query DB (AD-5)** — design decision đúng: role change take effect ngay, KHÔNG cần re-login, KHÔNG cần JWT blacklist
- **REUSE pattern** — Story 2.5 reuse AdminModule từ 2.4 (KHÔNG tạo module mới) → ít code, ít bug

## 3. What didn't go well
- **Subagent rate limit** — Story 2.5 dev phải implement trực tiếp (subagent bị rate-limit 32min) → không có code-reviewer + e2e-tester subagent riêng (self-review + direct e2e thay thế)
- **Playwright MCP sandboxed** — không connect được localhost:3100 → browser test phải dùng curl + vitest thay thế (Story 2.5)
- **E2e rate limit quota** — Story 2.5 e2e test order phải reorder (AC4 trước E1-E6) để tránh hit @Throttle 10/15min quota — lesson: test design cần tính đến rate limit quota
- **Mailpit SMTP** — admin.createUser không gửi confirmation email tự động → phải add dev-confirm-link log (Story 2.1 fix) — mất thời gian investigate
- **Auth e2e flaky** — Supabase Auth rate limit createUser khi chạy toàn bộ e2e song song (2/59 fail) — pass khi chạy riêng — không phải bug story

## 4. Lessons learned
- **Rate limit quota trong e2e test:** Khi endpoint có @Throttle, cần reorder test hoặc tách suite riêng (fresh app instance) để tránh quota exhaustion. Story 2.5: AC4 moved trước E1-E6, E6 gộp missing-role vào unit test
- **AdminGuard query DB (AD-5) > JWT role claim:** Query DB mỗi request tốn 1 SELECT nhưng admin traffic low → acceptable. Lợi: role change take effect ngay, KHÔNG cần JWT blacklist, KHÔNG cần re-login
- **Subagent MCP routing:** Inject MCP routing block vào task prompt → subagent dùng serena/context-engine/code-review-graph hiệu quả (Story 2.4 verified)
- **Self-revoke/self-ban block (R1 lockout):** Server check + web UI disable (defense-in-depth) — tránh admin tự lockout chính mình
- **Idempotent design:** Ban/unban/role-grant đều idempotent (200 nếu đã cùng state) → retry-safe cho client, đơn giản hơn

## 5. Metrics
- **Commits:** 5 feat commit (2.1, 2.2, 2.3, 2.4, 2.5) + 1 fix (Mailpit) + 3 chore (subagent profiles + MCP routing)
- **Unit tests:** 152 API + 30 web = 182 unit tests pass
- **E2e tests:** 72 e2e tests pass (8 suites: admin, auth, app, health, queue, sentry, upload, vietnamese-fts)
- **AC coverage:** 43/43 AC pass (100%)
- **Edge case coverage:** 12+12+8+12+8 = 52 edge case pass
- **Code review findings:** 1 HIGH (fixed 2.2) + 9 medium (non-blocking) + 19 low (non-blocking) — 0 critical

## 6. Risks còn mở (non-blocking)
- **M1 (2.4):** listUsers audit log `adminId: 'unknown'` — controller không truyền req.user.id vào service → audit trail gap
- **Throttler in-memory:** Rate limit reset khi restart API — production cần Redis throttle storage
- **Refresh token in response header log:** Low risk — pino redact đã cover
- **R2 (2.5):** Grant admin cho user không đáng tin — business policy out of scope, future audit log (Story 3.x)

## 7. Next steps
- **Epic 3: Listing Management & Search** — backlog (sprint-status.yaml)
- **Audit log:** Future story cho admin actions (who did what, when) — gap từ M1 (2.4) + R2 (2.5)
- **Redis throttle storage:** Production hardening — thay ThrottlerModule in-memory bằng Redis
- **Auth e2e flaky fix:** Isolate auth.e2e-spec.ts rate limit hoặc dùng separate Supabase project cho test
