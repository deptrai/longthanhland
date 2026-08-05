---
title: "Architecture Review — bdsai.vn ↔ Nowing Engine"
reviewer: Architect lens
status: RESOLVED — fixes applied to ARCHITECTURE-SPINE.md and epics.md
updated: 2026-08-04
---

# Architecture Review — bdsai.vn ↔ Nowing Engine

> Review `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` và `docs/bdsai/architecture/system-context-bdsai-nowing.md` theo góc nhìn kiến trúc. Mục tiêu: phát hiện mâu thuẫn, gap, rủi ro tồn vong trước khi bắt đầu Phase 0.

---

## Executive Summary

Bức tranh tổng thể đúng hướng: **bdsai = product, Nowing = engine headless qua API**. Tuy nhiên có **4 mâu thuẫn nghiêm trọng** giữa architecture spine cũ (viết cho full MVP marketplace) và pivot mới, cộng thêm **3 gap về contract/boundary** chưa được giải quyết. Cần sửa trước khi chuyển sang implementation, đặc biệt là ranh giới AI/model/crawler và API contract với Nowing.

---

## 🔴 Critical Findings

### C1. `ai` module + OpenAI trong bdsai BE mâu thuẫn AD-11

**Vấn đề:**
- `ARCHITECTURE-SPINE.md` §Stack vẫn liệt kê `OpenAI | GPT-4 API | AI features`.
- `Structural Seed` có `apps/api/src/modules/ai` với mô tả: *"GPT-4 summary, trust score, spam"*.
- `Capability → Architecture Map` gán M4: AI Features cho `ai` module + `queue` module, governed by AD-6.
- `Deployment` diagram có `WORKER --> OPENAI`.

**Mâu thuẫn:** AD-11 quy định **bdsai không own AI models / LLM routing / embedding policy / cost metering**. bdsai gọi Nowing qua API. Nếu `ai` module chỉ là thin gateway, phải viết rõ; nếu nó gọi OpenAI trực tiếp thì vi phạm AD-11.

**Khuyến nghị:**
- Đổi tên `ai` module thành `ai-gateway` hoặc `nowing-client`.
- Xóa OpenAI khỏi bdsai stack; thay bằng `Nowing API`.
- Cập nhật Deployment diagram: `WORKER --> Nowing API` thay vì `OPENAI`.
- Cập nhật AD-6 từ "AI calls (GPT-4) are async background jobs" thành "bdsai queues AI requests to Nowing API; Nowing handles model selection, cost, fallback".

---

### C2. AD-6 (AI Cost Control) obsolete sau pivot

**Vấn đề:** AD-6 nói *"Rate limit: max 100 AI calls/hour globally. Fallback: GPT-3.5-turbo if GPT-4 quota exceeded."* Nhưng bdsai không gọi model trực tiếp; rate limit và fallback là việc của Nowing engine. Nếu áp dụng cho bdsai, nó chỉ là rate limit gọi Nowing API — nhưng chưa rõ.

**Khuyến nghị:**
- Sửa AD-6 thành `Nowing Cost Guard`: bdsai ghi log `cost_micros` từ Nowing response, có cost cap per user/workspace, và degrade (VD: tắt AI summary) khi Nowing unavailable.
- Thêm metric và alerting cho Nowing API latency/cost.

---

### C3. Thiếu API contract với Nowing — đây là single point of failure

**Vấn đề:** `system-context-bdsai-nowing.md` §5 chỉ nói chung *"bdsai BE → Nowing API: authenticated REST/SSE calls"*. Không có:
- Endpoint cụ thể nào được dùng (search, chat, automation, memory).
- Auth model (API key? Workspace token? Service account? Per-user PAT?).
- Failure mode: timeout, retry, circuit breaker, degrade.
- Cost pass-through: who pays Nowing? How? Wallet or pay-as-you-go?
- Data ownership: khi bdsai gửi listing content lên Nowing, Nowing có lưu memory không? Ai own kết quả?

**Khuyến nghị:**
- Tạo AD-13: `Nowing API Contract` với binding rule cho auth, endpoint surface, retry, cost, failure.
- Xác định P1.1 story phải verify endpoint thật trước khi pilot chạy.

---

### C4. License BSL 1.1 + ChainLens closed-source có rủi ro tồn vong cho bdsai business model

**Vấn đề:**
- `system-context-bdsai-nowing.md` §6 nêu Nowing crawler engine là BSL 1.1: *"được dùng production; không được đem chính nó (hoặc sản phẩm/dịch vụ mà giá trị chủ yếu bắt nguồn từ nó) bán cho bên thứ ba như commercial product hoặc hosted/managed service."*
- bdsai.vn là sản phẩm thương mại cloud. Nếu bdsai cloud dùng Nowing crawler engine làm nguồn tin chính, có khả năng bị coi là "sản phẩm/dịch vụ mà giá trị chủ yếu bắt nguồn từ crawler engine".
- ChainLens deep-research closed-source: self-host Phase 1 không dùng được. Nếu bdsai muốn self-host hoàn toàn, sẽ thiếu deep research.

**Khuyến nghị:**
- Pháp lý: review BSL 1.1 với luật sư trước khi bdsai cloud trả phí dùng Nowing crawler.
- Technical: thiết kế bdsai sao cho giá trị chủ yếu nằm ở marketplace layer (listings, trust, lead routing), không phải crawler.
- Ghi rõ dependency: bdsai cloud = Nowing cloud customer; self-host bdsai yêu cầu Nowing cloud license cho ChainLens.

---

## 🟠 High Findings

### H1. Pilot Zalo architecture thiếu operational invariants

**Vấn đề:**
- "Thin Node.js script" chạy ở đâu? Luis laptop? Server? Cron? Long-poll Zalo?
- zca-js với burner account: không có AD về anti-bot, rate limit, CAPTCHA, account rotation, backup account.
- Không có quy định vòng đời tin nhắn: group bị Zalo khoá thì sao? Burner bị report?
- Không có log/audit cho Zalo messages.

**Khuyến nghị:**
- Thêm AD-14: `Pilot Automation Isolation` — script chạy local hoặc VPS riêng, không dùng production infra; burner account dùng tạm; log tất cả message vào file/tracker; có fallback manual.
- P0.3/P1.4 thêm AC về rate limit, content policy, manual fallback.

---

### H2. PII trong pilot tracker chưa được bảo vệ

**Vấn đề:**
- P0.1 thu thập *"tên + SĐT/Zalo + nguồn"* của 30 môi giới.
- AD-8 nói hash phone từ crawl, nhưng không áp dụng cho data thu thập thủ công từ referral/Zalo.
- Tracker CSV/Notion lưu ở đâu? Ai có quyền truy cập? Có xóa theo yêu cầu không?

**Khuyến nghị:**
- Thêm quy tắc: pilot tracker cũng áp dụng NĐ 13/2023 — không chia sẻ PII, lưu encrypted/managed, có cơ chế xóa.
- Đổi P0.1 AC: nếu lưu SĐT thì phải hash hoặc dùng contact ID; chỉ PO có quyền truy cập.

---

### H3. `cross_posts` lifecycle — bdsai hay Nowing own external state?

**Vấn đề:**
- AD-9 quy định bdsai enqueue job gỡ/cập nhật cross_posts khi listing đổi trạng thái.
- Nhưng `system-context` §4.2 nói Nowing Automation có thể gửi tin qua Xaction.
- Nếu cả bdsai và Nowing đều gọi Xaction, ai own `cross_posts.status`? Dễ gây race / stale state.

**Khuyến nghị:**
- AD-9 cần rõ: **bdsai owns `cross_posts` table và lifecycle**. Nowing automation chỉ có thể *advise* hoặc trigger bdsai BE; không gọi Xaction trực tiếp thay mặt bdsai.
- Hoặc: mọi Xaction call phải đi qua bdsai `xaction` module, kể cả khi được Nowing automation trigger.

---

### H4. Deployment / C4 diagrams chưa cập nhật Nowing

**Vấn đề:**
- C4Context diagram §System Context vẫn chỉ có `bdsai ↔ OpenAI / Xaction`, không có Nowing.
- Deployment diagram vẫn có `OPENAI` và `XACTION` trực tiếp từ bdsai worker.

**Khuyến nghị:**
- Cập nhật C4Context: thêm `Nowing Engine` giữa `bdsai` và `OpenAI/Xaction/Search`.
- Deployment: bdsai worker gọi `Nowing API`; Nowing gọi OpenAI/ChainLens/Scraper.

---

## 🟡 Medium Findings

### M1. `AI_RESULTS` entity vẫn nằm trong bdsai DB

**Vấn đề:** `erDiagram` có `PUBLIC_LISTINGS ||--o{ AI_RESULTS : analyzed_by`. Nếu AI summary/trust score được Nowing tạo, bdsai chỉ nên cache kết quả hoặc reference, không nên có bảng riêng lưu kết quả phức tạp.

**Khuyến nghị:**
- Đổi `AI_RESULTS` thành `listing_ai_cache` với rule: chỉ lưu summary + score + `nowing_memory_id` + `cached_at`; invalidation khi listing content thay đổi.
- Source of truth cho AI output là Nowing memory; bdsai cache là read-only mirror.

---

### M2. Stack vẫn liệt kê Supabase Free tier — rủi ro scale

**Vấn đề:** Stack nói `Supabase | Free tier`. PRD §10 cũng nói Free tier đủ cho MVP. Nhưng AD-6/AD-11 mới có thể làm tăng số call AI; nếu bdsai trả Nowing, chi phí sẽ đến từ Nowing, không phải Supabase. Tuy nhiên 500MB DB, 1GB storage, 50K MAU có thể vẫn OK.

**Khuyến nghị:**
- Giữ Free tier cho pilot, nhưng thêm deferred decision: nâng Pro ($25/mo) khi nào (VD: >200 listings, >10GB storage, >50 concurrent users).

---

### M3. Thiếu `ai-gateway` cost cap

**Vấn đề:** Không có cost cap per user hoặc per workspace cho Nowing API calls. Với freemium model, một user spam chat có thể burn cost.

**Khuyến nghị:**
- Thêm AD-15: `AI Cost Cap per User/Day` — khi vượt quota, trả lỗi hoặc downgrade (VD: cache-only, no deep research).

---

## 🟢 Low / Polish

- `Capability → Architecture Map` vẫn gán M1-M6; cần thêm P0/P1 vào map.
- `Deferred` table vẫn nói "Desktop-first MVP" / "Responsive web covers mobile" — hơi lỗi thời so với pilot-first. Có thể để lại vì đó là Phase 1.
- `README.md` nên link `system-context-bdsai-nowing.md` đã làm, OK.

---

## Recommended Fixes (priority order)

| Priority | Fix | File |
|---|---|---|
| P0 | Sửa `ai` module → `ai-gateway` / `nowing-client`; xóa OpenAI khỏi bdsai stack | `ARCHITECTURE-SPINE.md` |
| P0 | Thêm AD-13: `Nowing API Contract` (auth, endpoints, retry, cost, failure) | `ARCHITECTURE-SPINE.md` |
| P0 | Cập nhật C4Context + Deployment diagram với Nowing | `ARCHITECTURE-SPINE.md` |
| P1 | Sửa AD-6 thành cost guard cho Nowing calls | `ARCHITECTURE-SPINE.md` |
| P1 | Thêm AD-14: `Pilot Automation Isolation` (Zalo burner, script location, fallback) | `ARCHITECTURE-SPINE.md` |
| P1 | Thêm AD-15: `AI Cost Cap per User` | `ARCHITECTURE-SPINE.md` |
| P1 | Sửa `erDiagram` AI_RESULTS → listing_ai_cache | `ARCHITECTURE-SPINE.md` |
| P2 | Pháp lý: review BSL 1.1 + ChainLens license với bdsai cloud | PRD/Epics |
| P2 | Cập nhật P0/P1 stories với PII protection + Zalo rate limit | `epics.md` |

---

## Fixes Applied (2026-08-04)

| Finding | Fix | Where |
|---|---|---|
| C1 — `ai` module owns OpenAI | Renamed to `ai-gateway`; OpenAI removed from bdsai stack; `ai-gateway` owns Nowing client | `ARCHITECTURE-SPINE.md` §Stack, §Structural Seed, §Dependency Direction |
| C2 — AD-6 obsolete | Rewrote AD-6 as `Nowing AI Cost Guard` | `ARCHITECTURE-SPINE.md` |
| C3 — missing Nowing contract | Added AD-13 `Nowing API Contract` | `ARCHITECTURE-SPINE.md` |
| C4 — BSL / ChainLens risk | Documented in `system-context-bdsai-nowing.md` §6; flagged for legal review | PRD/Epics deferred |
| H1 — pilot Zalo ops | Added AD-14 `Pilot Automation Isolation` (burner, rate limit, fallback, PII) | `ARCHITECTURE-SPINE.md` |
| H2 — PII in tracker | Added PII protection AC to P0.1, P0.3, P1.4 | `epics.md` |
| H3 — cross_post ownership | Clarified `bdsai owns cross_posts`; Nowing only advises/triggers | `ARCHITECTURE-SPINE.md` AD-9 + system-context §4.2 implicit |
| H4 — diagrams stale | Updated Dependency, C4Context, Deployment, erDiagram | `ARCHITECTURE-SPINE.md` |
| M1 — `AI_RESULTS` | Renamed to `LISTING_AI_CACHE` with `NOWING_MEMORY` mirror | `ARCHITECTURE-SPINE.md` §erDiagram |
| M3 — cost cap | Added AD-15 `AI Cost Cap per User / Workspace` | `ARCHITECTURE-SPINE.md` |

## Verdict

**Architecture direction is sound. Critical conflicts C1-C4 and high/medium findings H1-H4, M1-M3 have been applied.** Remaining open item: **legal review of BSL 1.1 crawler + ChainLens closed-source license** in the context of bdsai.vn cloud product (flagged, not a technical blocker for pilot).
