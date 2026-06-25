# Epic 1 Retrospective — Foundation & Infrastructure

**Epic:** 1 — Foundation & Infrastructure
**Project:** bdsai.vn (sàn BĐS AI Long Thành)
**Date:** 2026-06-26
**Status:** DONE (6/6 story, 45/45 AC)
**Branch:** production (6 commit ahead origin)

## 1. Epic Review

### Stories completed
| Story | Tên | AC | Review findings | E2e verdict |
|---|---|---|---|---|
| 1.1 | Khởi tạo monorepo Turborepo | 6/6 | — | PASS (6/6 real test) |
| 1.2 | Kết nối Supabase | 7/7 | 6 low (LOW-1→LOW-6, fixed) | PASS (7/7, curl /health/supabase 200) |
| 1.3 | CI/CD GitHub Actions | 7/7 | 3 medium + 5 low (M1/M2/M3 fixed) | PASS (7/7, docker build + smoke 200) |
| 1.4 | Base UI layout/nav/responsive | 8/8 | 2 medium + 3 low (M1/M2 fixed) + E1 (dev mode) | PASS (8/8, browser 3 viewport) |
| 1.5 | Vietnamese Full-Text Search | 8/8 | 4 low (non-blocking) | PASS (8/8, psql FTS match thật) |
| 1.6 | Redis/BullMQ/Drizzle/Sentry | 9/9 | 1 medium (M1 shutdown order) + 4 low | PASS (9/9, Redis PONG + BullMQ complete) |

**Tổng:** 45/45 AC thỏa, 0 critical/high còn mở, 6/6 story DONE.

### Hạ tầng tạo ra
- **Monorepo:** Turborepo (apps/web Next 16 + apps/api Nest 11 + packages/shared)
- **DB:** Supabase PostgreSQL 15.8 + Drizzle 0.36 + postgres.js + FTS tiếng Việt (unaccent + pg_trgm, 2 function IMMUTABLE)
- **CI/CD:** GitHub Actions (CI gate + deploy Vercel CLI + Dokploy GHCR + Lighthouse SEO gate post-deploy)
- **UI:** shadcn/ui manual (Tailwind 4 CSS-first) + Geist + responsive 360→1440 + SSR + a11y (contrast AA, touch target 44px, aria-label)
- **Hạ tầng nền:** Redis 7 Docker + BullMQ (AD-6) + Sentry api/web (AD-5 redact) + nestjs-pino JSON logger + global exception filter + monitoring NFR5 (DB/Storage size cron)
- **Test:** Vitest (web 10) + Jest (api 25 unit + 17 e2e) + actionlint + docker build + browser MCP

### Invariant AD tuân thủ
- AD-1 (Module Isolation): module riêng, không lẫn logic ✓
- AD-2 (Single Data Mutation Path): migration Drizzle duy nhất ✓
- AD-4 (SSR/SEO): header/footer server component, Lighthouse gate ✓
- AD-5 (Auth Separation): Sentry redact secret, service-role chỉ backend ✓
- AD-6 (Background Job): BullMQ queue, không async trong request ✓
- AD-8 (PII/Secret): GitHub Secrets, Docker không bake secret, grep clean ✓
- AD-10 (Next API mỏng): layout không business logic ✓
- NFR5 (DB/Storage monitoring): cron hourly, threshold 400/800MB ✓
- NFR8 (Vietnamese search): FTS có dấu/không dấu ✓

## 2. Lessons Learned

### What went well
1. **Pipeline harness 4 trạm (author→dev→review→e2e) hoạt động ổn định** — 6/6 story pass qua đầy đủ, 0 critical/high còn mở. Mỗi trạm verify độc lập, không tin log trạm trước.
2. **Real-data test bắt lỗi thật** — e2e với Supabase real, Redis PONG, browser MCP 3 viewport, docker smoke 200, psql FTS match. Không có story nào pass mà chỉ đọc code đoán.
3. **Review adversarial hiệu quả** — reviewer verify độc lập (grep, build, đọc code), phát hiện M1/M2/M3/E1 mà dev log bỏ qua. 0 critical/high nhưng nhiều medium fix được trước e2e.
4. **Drizzle `--custom` migration giải LOW-5** — Story 1.5 chứng minh `drizzle-kit generate --custom` hoạt động với schema rỗng, sinh journal + snapshot tự động.
5. **shadcn/ui manual thay CLI** — Tailwind 4 CSS-first compatible, tránh CLI fail, kiểm soát đầy đủ.
6. **Fix MEDIUM trước e2e** — pattern tốt: review → fix medium → e2e verify fix. E1 (legacyBehavior break dev mode) chỉ phát hiện ở e2e vì dev/review dùng production build.

### What could be improved
1. **Story 1.5 + 1.6 commit bị trộn** — do user chọn "chạy tiếp" trước khi commit, 2 story uncommitted cùng lúc. Tách commit phải stage selective. **Action: commit ngay sau mỗi story done, không để dồn.**
2. **M1 Story 1.6 (QueueModule shutdown order) còn mở** — non-blocking nhưng teardown hygiene. **Action: fix trước deploy prod (story 2.x hoặc hotfix).**
3. **E1 Story 1.4 (legacyBehavior) chỉ phát hiện ở e2e** — dev/review dùng production build, dev mode break bị miss. **Action: e2e test nên chạy cả `yarn dev` smoke (không chỉ `yarn start`).**
4. **5 LOW từ 1.3 + 4 LOW từ 1.6 chưa fix** — defer nhưng tích lũy. **Action: batch fix LOW trước Epic 2 hoặc gộp vào story chạm lại file.**
5. **L1 Story 1.4 (legacyBehavior) đã fix E1** — nhưng review log ghi là LOW, e2e upgrade lên MEDIUM. **Action: review nên test dev mode, không chỉ production.**
6. **Image Docker 333MB > 300MB lý tưởng** — soft target, chưa optimize. **Action: multi-stage refine + prune devDeps kỹ hơn ở story sau.**
7. **`.playwright-mcp/` artifact ban đầu chưa gitignore** — browser MCP console log bị track. **Action: thêm .gitignore sớm, check artifact trước commit.**

### Pattern lặp lại đáng chú ý
- **Drizzle custom migration:** schema rỗng → `--custom` flag. Story 1.5 giải, ghi vào MIGRATIONS.md cho story sau.
- **Tailwind 4 CSS-first:** không `tailwind.config.js`, config qua `@theme` trong `globals.css`. shadcn CLI cũ fail → manual.
- **Server vs Client component:** Header = server (SSR), MobileNav = client island. Pattern lặp cho mọi interactive UI.
- **Sentry DSN optional:** graceful skip khi empty. Pattern lặp cho mọi external service optional.
- **Exception filter shape:** `{ statusCode, message, error?, details? }` — chuẩn AD consistency.

## 3. Action Items

| # | Action | Owner | Priority | Khi nào |
|---|---|---|---|---|
| A1 | Commit ngay sau mỗi story done (không dồn) | leader | high | Epic 2 trở đi |
| A2 | Fix M1 Story 1.6 (QueueModule shutdown order) | dev | medium | Trước deploy prod |
| A3 | E2e test chạy cả `yarn dev` smoke (không chỉ `yarn start`) | e2e-tester | medium | Epic 2 trở đi |
| A4 | Batch fix LOW còn mở (5 từ 1.3 + 4 từ 1.6) | dev | low | Trước Epic 2 hoặc story chạm lại |
| A5 | Docker image optimize (< 300MB) | dev | low | Story deploy prod |
| A6 | Review nên test dev mode, không chỉ production | reviewer | medium | Epic 2 trở đi |
| A7 | Check artifact (browser MCP, temp file) trước commit | leader | low | Mỗi commit |

## 4. Metrics

- **Stories:** 6/6 done (100%)
- **AC:** 45/45 pass (100%)
- **Critical/High còn mở:** 0
- **Medium còn mở:** 1 (M1 Story 1.6, non-blocking)
- **Low còn mở:** 9 (defer, non-blocking)
- **Test:** web 10 unit + api 25 unit + 17 e2e + actionlint + docker build + browser MCP
- **Commit:** 6 trên branch production (1.1+1.2 → 1.2 LOW fix → 1.3 → 1.4 → 1.5 → 1.6)
- **Pipeline trạm:** 4 trạm × 6 story = 24 trạm chạy, 0 retry critical

## 5. Next Epic Preparation (Epic 2 — User Authentication & Profiles)

### Epic 2 scope (từ epics.md)
- Story 2.1: Đăng ký bằng email + phone
- Story 2.2: Đăng nhập + logout + session
- Story 2.3: Quản lý profile (avatar, tên, SĐT)
- Story 2.4: Admin auth flow + privilege escalation prevention (AD-5)
- Story 2.5: OAuth (Google) — optional

### Hạ tầng sẵn sàng cho Epic 2
- Supabase Auth (có từ Story 1.2) — cần config provider email/phone
- Base UI (Story 1.4) — header có nút đăng nhập/đăng tin, cần trang auth
- Route groups (public)/(dashboard)/(admin) — sẵn cho auth pages
- Exception filter + Sentry — sẵn cho error handling auth
- BullMQ queue — sẵn cho email verification job

### Risks Epic 2
- Supabase Auth config (email/phone provider) cần verify local
- AD-5 (Auth Separation): admin flow riêng, privilege escalation prevention
- Phone auth cần SMS provider (Twilio/Vonage) — có thể mock ở dev
- OAuth Google cần Google Cloud credentials

### Recommendation
- Chạy Story 2.1 trước (đăng ký email + phone) — foundation cho Epic 2
- Fix A1 (commit ngay) + A3 (e2e dev mode) + A6 (review dev mode) trước Epic 2
- A2 (M1 shutdown) + A4 (LOW batch) + A5 (Docker optimize) có thể defer

---

**Retrospective verdict:** Epic 1 thành công. Hạ tầng vững, pipeline ổn, 0 critical/high còn mở. 7 action items để cải tiến Epic 2. Sẵn sàng Epic 2.
