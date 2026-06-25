# Story 1.3 — Author Log (story-author)

**Story:** 1-3-cicd-github-actions
**Agent:** opus (skill bmad-create-story, agent story-author)
**Ngày:** 2026-06-26
**Kết quả:** Story file tạo xong, status `backlog → ready-for-dev`

---

## Output table (3/3 — tự verify)

| # | Output | Path | Status |
|---|--------|------|--------|
| 1 | Story file | `_bmad-output/implementation-artifacts/1-3-cicd-github-actions.md` | ✅ Đã ghi (7 AC + 7 Task + Dev Notes + edge case + References) |
| 2 | Sprint status | `_bmad-output/implementation-artifacts/sprint-status.yaml` | ✅ `1-3-cicd-github-actions: ready-for-dev` (dòng 51), `last_updated: 2026-06-26` (dòng 38, đã đúng từ trước) |
| 3 | Author log | `_bmad-output/harness-workspace/1-3-cicd-github-actions/01-author.md` | ✅ File này |

---

## Nguồn đã đọc (để viết Dev Notes khớp code thật)

1. `docs/bdsai/planning/epics.md` (dòng 140-194) — Epic 1, Story 1.3 AC gốc + quy ước test toàn dự án (dòng 144: Story 1.3 là CI gate).
2. `docs/bdsai/architecture/ARCHITECTURE-SPINE.md` — AD-4 (SSR/SEO, Lighthouse gate), AD-5 (auth, secret không lộ), AD-8 (PII/secret, GitHub Secrets), AD-1, AD-10, Stack (Vercel FE + Dokploy Docker BE, Node 22, NestJS 11), Consistency Conventions, Deployment diagram, Structural Seed (`.github/workflows/`, `apps/api/Dockerfile`).
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` — story queue: 1.1 done, 1.2 done, 1.3 backlog → nâng ready-for-dev.
4. `_bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/00-infra-decisions.md` — port 5435x, code ở `bdsai/`, Turborepo, Node 22.22.3, Docker 29.4.0, yarn 4.9.2.
5. `_bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md` — trạng thái apps/api + apps/web, scripts yarn build/typecheck/lint/test PASS (3/3, 4/4, 4/4, 3/3), `/health/supabase` endpoint 200, env mẫu.
6. Code thật `bdsai/`:
   - `turbo.json` — tasks build/lint/typecheck/test (dependsOn `^build`), outputs `.next/**`/`dist/**`/`coverage/**`.
   - `apps/api/package.json` — `build: nest build`, `start:prod: node dist/main.js`, `test: jest --passWithNoTests`, port 3101.
   - `apps/web/package.json` — `build: next build`, `dev: next dev -p 3100`, port 3100, `test: echo "no web unit tests yet"`.
   - `packages/shared/package.json` — `@bdsai/shared`, build `tsc`.
   - `.env.example` (root) + `apps/api/.env.example` — danh sách biến env (Supabase, DATABASE_URL, API_PORT...).
7. `_bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md` — public pages SSR `/`, `/listings`, `/listings/[id]` (Lighthouse CI target, AD-4).
8. `.claude/agents/story-author.md` — persona + protocol (3 output bắt buộc, tự verify).
9. `.claude/skills/bmad-create-story/template.md` — story file template convention.
10. Story 1.2 file (`1-2-ket-noi-supabase.md`) — convention AC đánh số + Dev Notes + References [Source:].

---

## Quyết định kiến trúc nhỏ (tự chốt — ghi trong story Dev Notes)

1. **CI workflow** `.github/workflows/ci.yml`: trigger push/PR nhánh `production` + `develop`. lint+typecheck+build+test cả 3 package qua Turborepo, `yarn install --immutable`.
2. **Deploy workflow** `.github/workflows/deploy.yml`: tách file, trigger `on: push: branches: [production]` CHỈ. Bên trong chạy lại CI gate rồi 2 job song song `deploy-web` (Vercel CLI) + `deploy-api` (Docker build+push GHCR + Dokploy webhook). Lý do tách + chạy lại gate: tránh phụ thuộc cross-workflow `workflow_run` (race condition).
3. **Vercel deploy**: Vercel CLI (`vercel deploy --prod --yes`) thay vì auto Git integration — kiểm soát explicit, logs trong GitHub Actions.
4. **Dokploy deploy**: Docker image → push **GHCR** (`ghcr.io/<owner>/bdsai-api`, dùng `GITHUB_TOKEN` mặc định) → Dokploy API/webhook trigger redeploy.
5. **Lighthouse CI**: job trong `deploy.yml`, `needs: [deploy-web]`, post-deploy gate trên URL production. 3 page mục tiêu `/`, `/listings`, `/listings/[id]` — **chốt skip `/listings/[id]` ở 1.3** (chưa có SSR detail thật, story 3.4 mới có), chỉ gate `/` + `/listings` (2 page prerender có từ 1.1/1.2). TODO ghi cho story 3.4.
6. **Secrets**: GitHub Secrets (danh sách AC5). Docker registry GHCR dùng `GITHUB_TOKEN` auto. KHÔNG hardcode, KHÔNG bake secret vào Docker layer (truyền runtime).
7. **Docker**: `apps/api/Dockerfile` multi-stage (builder node:22-alpine → runtime node:22-alpine), expose 3101, HEALTHCHECK `/health/supabase`.
8. **Test workflow**: `yarn workflow:validate` (actionlint nếu có, fallback yaml parse). Không test nghiệp vụ.
9. **Workflow files ở repo root `.github/workflows/`** (KHÔNG `bdsai/.github/workflows/` — GitHub không nhận diện). Config files (`.lighthouserc.js`, `Dockerfile`, `SECRETS.md`) ở `bdsai/`.

---

## AC tóm tắt (7 AC)

- AC1: CI workflow lint+typecheck+build+test cả 3 package qua Turborepo (push/PR production+develop)
- AC2: Deploy workflow trigger merge production — web→Vercel, api→Docker+Dokploy
- AC3: Gate — pipeline fail nếu lint/typecheck/build/test lỗi, KHÔNG deploy khi CI fail
- AC4: Lighthouse CI gate SEO ≥ 90 trên public pages (AD-4, NFR3)
- AC5: Secrets qua GitHub Secrets, không hardcode (verify grep)
- AC6: Dockerfile multi-stage apps/api (build dist → runtime nhỏ, expose 3101, healthcheck)
- AC7: Workflow syntax hợp lệ (actionlint/yaml) + Dockerfile build được local

---

## Edge case nêu trong story

- PR từ fork → không chạy deploy (secrets không lộ)
- Lighthouse fail nhưng build pass → vẫn chặn (post-deploy gate + issue)
- Turborepo cache hit → trust cache cho test (input hash khớp)
- Docker build fail → api không deploy, web vẫn deploy được (độc lập)
- Supabase env thiếu trong CI → e2e skip (CI chỉ chạy unit), KHÔNG giả vờ pass
- Vercel deploy fail / Dokploy webhook fail → job fail, tạo issue
- Secret leak trong log → GitHub auto-mask, tránh echo chủ ý, KHÔNG bake secret vào Docker layer

---

## Handoff tới story-developer

**Story 1.3 ready-for-dev.** File tại `_bmad-output/implementation-artifacts/1-3-cicd-github-actions.md`.

Developer cần lưu ý:
- Đọc kỹ section "Bối cảnh dự án" + "Trạng thái từ Story 1.1 + 1.2" — KHÔNG làm lại scaffold/Supabase.
- Workflow files ở **repo root `.github/workflows/`** (lưu ý path, KHÔNG nhầm với `bdsai/.github/`).
- Dockerfile build context = `bdsai/` (để copy `packages/shared`).
- Lighthouse skip `/listings/[id]` ở story này (TODO story 3.4).
- Verify local: `docker build` + `yarn build/lint/typecheck/test` PASS. CI chạy thật trên GitHub do reviewer/leader confirm (ngoài scope dev local).
- Tuân thủ AD-4 (Lighthouse gate), AD-5 (secret không lộ log), AD-8 (GitHub Secrets, không hardcode).

Baseline commit: developer ghi vào story file header khi bắt đầu dev.
