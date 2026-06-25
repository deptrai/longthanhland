---
name: bmad-story-cycle-orchestrator
description: Chạy story cycle bdsai.vn cho từng story Track A — điều phối đội 4 agent (story-author/dev/review/e2e) qua skill BMad với model chỉ định. Dùng khi user nói "làm story tiếp theo", "chạy story cycle", "dev story X", "làm từng story", "implement story", "tiếp tục story cycle", "làm story đi", hoặc muốn build tính năng bdsai.vn theo sprint. KHÔNG dùng cho Track B (Xaction — blocked) hay câu hỏi planning đơn thuần.
---

# BMad Story Cycle Orchestrator — bdsai.vn

Điều phối đội agent chạy vòng đời 1 story: **create-story → dev-story → code-review → e2e (real data) → done**. Mỗi trạm dùng skill BMad + model chỉ định.

## Đội & model

> **Model thực tế: TẤT CẢ opus-4.8.** `.claude/settings.json` set `CLAUDE_CODE_SUBAGENT_MODEL=opus-4.8` (Option A) → env var pin mọi subagent về opus, thắng cả frontmatter `model:` và param khi gọi Agent. Thiết kế gốc muốn e2e=sonnet nhưng env var là "all-or-one" — không split được trừ khi gỡ var global. Đây là đánh đổi đã chọn (không đụng global, chấp nhận e2e cũng opus).

| Agent | subagent_type | model thực tế | Skill BMad |
|---|---|---|---|
| story-author | story-author | opus | bmad-create-story |
| story-developer | story-developer | opus | bmad-dev-story |
| code-reviewer | code-reviewer | opus | bmad-code-review |
| e2e-tester | general-purpose | opus (gốc muốn sonnet) | bmad-qa-generate-e2e-tests + test-e2e-browser |

> e2e-tester dùng general-purpose vì cần chạy script + browser (Explore read-only không được).

## Workspace

- Mọi log trung gian: `_bmad-output/harness-workspace/{story-key}/` (01-author.md, 02-dev.md, 03-review.md, 04-e2e.md).
- Story file: `_bmad-output/implementation-artifacts/{story-key}.md`.
- Trạng thái: `_bmad-output/implementation-artifacts/sprint-status.yaml` (nguồn chân lý story queue).

## Phase 0: Context check (đầu mỗi lần chạy)

1. Đọc `sprint-status.yaml` → tìm story Track A tiếp theo: status `backlog` (hoặc `ready-for-dev` nếu đã có file), KHÔNG `blocked`, theo thứ tự Epic 1→2→3→4→6, story số tăng dần.
2. Nếu user chỉ định story cụ thể → dùng story đó (kiểm tra không phải Track B).
3. Kiểm `_bmad-output/harness-workspace/{story-key}/` đã tồn tại chưa:
   - Có + user yêu cầu tiếp tục → đọc log cũ, chạy tiếp từ trạm dở.
   - Có + story đã done → bỏ qua, lấy story kế.
   - Chưa → chạy mới.
4. **Chặn Track B:** nếu story key thuộc Epic 5 hoặc 4-2b → từ chối, báo user cần gỡ gate Xaction (API docs + ToS compliance) trước.

## Phase 1: Tạo team

`TeamCreate` team "story-cycle" với 4 thành viên (author, developer, reviewer, e2e-tester). Leader = bạn (orchestrator). Tạo task qua `TaskCreate` với dependency:
- T1 author → T2 dev (blockedBy T1) → T3 review (blockedBy T2) → T4 e2e (blockedBy T3).

## Phase 2: Pipeline 1 story (generate-verify, có vòng lặp)

```
[story-author/opus] tạo story file, status→ready-for-dev
        ↓
[story-developer/opus] implement + test, status→in-progress→review
        ↓
[code-reviewer/opus] review adversarial
        ├─ CHANGES REQUESTED → quay lại developer (fix tận gốc) ──┐
        └─ APPROVED ↓                                            │
[e2e-tester/sonnet] test REAL DATA (API thật / browser thật)     │
        ├─ FAIL → quay lại developer ────────────────────────────┘
        └─ PASS → status→done
```

**Vòng lặp fix:** reviewer/e2e fail → developer sửa → re-verify. Một cách fail 2 lần → developer đổi cách tiếp cận, báo leader. Tối đa 3 vòng/story rồi escalate user.

## Phase 3: Đóng story + tiếp theo

1. Story done → cập nhật sprint-status.yaml (`done`); epic → `in-progress` nếu story đầu, `done` nếu hết story.
2. Báo user tóm tắt: story làm gì, test thật nào pass, file đã đổi.
3. Hỏi user: làm story tiếp theo hay dừng? (KHÔNG tự động chạy hết 27 story trừ khi user nói "làm hết").

## Data passing

- **Task-based** (TaskCreate/Update): trạng thái + dependency giữa trạm.
- **File-based** (harness-workspace/): log mỗi trạm, audit trail.
- **Message-based** (SendMessage): findings review/e2e trả developer real-time.

## Error handling

- App chưa chạy được (env/DB chưa setup): story hạ tầng test ở mức build/healthcheck; story nghiệp vụ → báo user cần setup Supabase/env trước, không giả vờ pass.
- 1 trạm fail terminal sau 1 retry → ghi log, báo user, KHÔNG đánh dấu done.
- Conflict/nghi ngờ → giữ nguyên, báo user, không xóa.

## Test scenario

- **Normal:** Story 1.1 → author tạo file → dev scaffold monorepo → review pass → e2e build/healthcheck pass → done.
- **Error:** Story 3.2 dev quên magic-bytes validation → reviewer CHANGES REQUESTED → dev fix → review pass → e2e browser test upload thật → done.
- **Track B block:** user "làm story 5.1" → orchestrator từ chối, báo gate Xaction chưa mở.
