# Story 1.2 — Author Log (story-author)

**Story:** 1-2-ket-noi-supabase
**Agent:** opus-4.8 (skill bmad-create-story)
**Ngày:** 2026-06-25
**Kết quả:** Story file tạo xong → Status `ready-for-dev`

---

## 1. Output đã ghi (3/3)

| # | Output | Đường dẫn | Trạng thái |
|---|---|---|---|
| 1 | Story file | `_bmad-output/implementation-artifacts/1-2-ket-noi-supabase.md` | ✅ ghi (7 AC + 7 Task + Dev Notes đầy đủ) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ✅ `1-2-ket-noi-supabase: backlog → ready-for-dev` |
| 3 | Author log | `_bmad-output/harness-workspace/1-2-ket-noi-supabase/01-author.md` | ✅ file này |

## 2. Nguồn đã đọc & phân tích
- `epics.md` → Epic 1 → Story 1.2 (AC gốc Given/When/Then) + Quy ước test toàn dự án.
- `ARCHITECTURE-SPINE.md`: AD-1/2/5/8/10, Consistency Conventions, Stack (PG15, Drizzle 0.36), Structural Seed (drizzle.config.ts, lib/supabase).
- Story 1.1 logs: `00-infra-decisions.md` (port 5435x, code ở `bdsai/`) + `02-dev.md` (trạng thái scaffold, L1 PG version).
- Scaffold thật `bdsai/`: `supabase/config.toml`, `apps/api/package.json`, `app.module.ts`, `main.ts`, `.env.example` — đọc để Dev Notes khớp code thật.
- Drizzle ORM docs qua Context7 (`/drizzle-team/drizzle-orm-docs`): connect-supabase `prepare: false`, drizzle.config.ts, drizzle-kit migrate.
- (Perplexity hết quota — không chặn; version chốt theo stack doc + Context7.)

## 3. Quyết định/điểm nhấn trong story
- **7 AC** (đánh số AC1–AC7), trong đó:
  - AC4 = KHÔNG tạo bảng nghiệp vụ (schema/ rỗng có chủ đích).
  - AC5 = connection pooling Supabase Free (postgres.js `prepare:false`, `max`, `idle_timeout`; prod Supavisor 6543).
  - **AC6 = chốt L1 PostgreSQL version mismatch** (config.toml `major_version=17` vs stack/AC = PG15) → mặc định pin về 15 + `supabase stop/start` + verify `SELECT version()`. Đây là item review 1.1 yêu cầu xử lý ở story này.
  - AC7 = test tự động (unit config validation + integration healthcheck).
- Dev Notes gói đủ: bối cảnh bdsai (không phải Twenty), trạng thái 1.1, **port 5435x** (cảnh báo không dùng 5434x), 5 invariant AD liên quan, versions cụ thể, source tree NEW/UPDATE, edge cases, testing standards, References có [Source:].
- Quyết định kiến trúc nhỏ tự chốt (ghi rõ trong story): driver `postgres` (postgres.js) thay vì `pg`; migration `out` = `src/db/migrations` (tách khỏi `supabase/migrations`) để Drizzle là nguồn chân lý schema.

## 4. Phạm vi (đúng Track A)
- Story 1.2 thuộc Epic 1 Track A — hợp lệ. KHÔNG đụng Track B (Epic 5 / 4.2b blocked).
- Tuân thứ tự: Epic 1 story 1.1 DONE → 1.2 là story kế tiếp đúng queue.

## 5. Handoff
- Tới **story-developer**: Story `1-2-ket-noi-supabase` ready-for-dev, file tại
  `_bmad-output/implementation-artifacts/1-2-ket-noi-supabase.md`.
- Lưu ý dev: xử lý AC6 (PG version) cần `supabase stop && supabase start` lại; lấy anon/service-role key bằng `supabase status`; KHÔNG commit key prod.
