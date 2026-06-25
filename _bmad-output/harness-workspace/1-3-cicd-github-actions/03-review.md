# Code Review — Story 1.3: CI/CD GitHub Actions → Vercel + Dokploy

| Field | Value |
|---|---|
| Story key | `1-3-cicd-github-actions` |
| Agent | code-reviewer (opus) |
| Ngày | 2026-06-26 |
| Verdict | **APPROVED** (0 critical, 0 high; 3 medium + 5 low non-blocking — fix medium trước production deploy đầu) |
| Baseline | `7b923aeab9` (production, sau Story 1.2) |

## 1. Phương pháp review (adversarial)

- Tự đọc code thật: `ci.yml`, `deploy.yml`, `Dockerfile`, `.dockerignore` (×2), `.lighthouserc.js`, `SECRETS.md`, `validate-workflows.mjs`, `package.json`, `turbo.json`, `apps/web/app/(public)/page.tsx`.
- Tự chạy `git status` → verify 8 file mới/sửa tồn tại (untracked + modified).
- Tự chạy `grep -rE "(eyJ|sk-|supabase_service_role|postgres://postgres:postgres)"` trên tất cả file story → match duy nhất ở `SECRETS.md:58` là **example grep command trong doc**, KHÔNG phải literal secret. CLEAN.
- Tự chạy `yarn workflow:validate` → PASS (python3 PyYAML fallback, actionlint chưa cài).
- Tự chạy `yarn build` (3/3 PASS, FULL TURBO cache), `yarn lint` (4/4 PASS), `yarn typecheck` (4/4 PASS), `yarn test` (api 11/11 PASS) → KHÔNG phá 1.1/1.2.
- Tự chạy `docker history bdsai-api:test | grep -iE "DATABASE_URL|SERVICE_ROLE|SUPABASE_URL"` → exit 1 (no match) → KHÔNG bake secret vào layer (AD-8 OK).
- Verify `apps/web` source tree: **chỉ có 1 route `/`** (`app/(public)/page.tsx`) — KHÔNG có `/listings` page. Build output confirm: `Route (app) ┌ ○ / └ ○ /_not-found`.

## 2. Findings

### MEDIUM

#### M1 — `.lighthouserc.js` gate URL `/listings` không tồn tại trong web app
- **File:** `bdsai/.lighthouserc.js:24` (`'https://bdsai.vn/listings'`)
- **Mô tả:** AC4 + story Dev Notes chốt gate `/` + `/listings` với lý do "2 page đã có SSR placeholder từ 1.1/1.2 prerender". Verify thực tế: `apps/web` chỉ có route `/` (`app/(public)/page.tsx`) — **KHÔNG có `/listings` page** (build output chỉ ra `/` + `/_not-found`). Lighthouse CI sẽ chạyagainst URL `https://bdsai.vn/listings` → trả 404. Hậu quả: (a) nếu LHCI fail trên non-200 → job `lighthouse` fail → `lighthouse-fail-issue` tạo spurious GitHub issue trên MỌI production deploy tới story 3.3; (b) nếu LHCI vẫn chạy trên 404 page (Next.js render 404 HTML) → SEO score vô nghĩa, gate "bảo vệ" một page không tồn tại → AC4 không được thỏa đúng ý cho `/listings`. Dev log §8 đã acknowledge nhưng vẫn để URL trong config.
- **Cách sửa:** Xóa `'https://bdsai.vn/listings'` khỏi `collect.url` trong `.lighthouserc.js` cho tới khi story 3.3 sinh SSR page `/listings` (giữ TODO comment). Gate chỉ `/` ở story 1.3. Hoặc tạo placeholder SSR page `/listings` ngay (ngoài scope 1.3). Khuyến nghị option 1 (xóa URL) — gate `/` là đủ cho 1.3, thêm `/listings` ở 3.3.

#### M2 — `deploy.yml` job `deploy-api` thiếu `permissions: packages: write` cho GHCR push
- **File:** `.github/workflows/deploy.yml:96-130` (job `deploy-api`)
- **Mô tả:** Job dùng `docker/login-action` với `secrets.GITHUB_TOKEN` rồi `docker/build-push-action push: true` lên `ghcr.io`. Nhưng job KHÔNG khai báo `permissions: packages: write`. `GITHUB_TOKEN` mặc định có quyền theo repo setting — nếu repo dùng GitHub secure default (token permissions = read-only / restricted, khuyến nghị của GitHub), GHCR push sẽ **fail với 403** ở production deploy đầu tiên. Job `lighthouse-fail-issue` đã khai báo `permissions: issues: write` đúng → `deploy-api` cũng cần tương đương.
- **Cách sửa:** Thêm vào job `deploy-api`:
  ```yaml
  permissions:
    contents: read
    packages: write
  ```
  Làm tương tự cho job `ci-gate`/`deploy-web` nếu cần `contents: read` (optional, default OK).

#### M3 — `Dockerfile` builder chạy `yarn build` (build CẢ 3 package incl. web) thay vì "chỉ api + shared" (AC6)
- **File:** `bdsai/apps/api/Dockerfile:24` (`RUN yarn build`)
- **Mô tả:** AC6 spec: builder stage "`yarn build` (chỉ api + shared)". Thực tế `yarn build` = `turbo run build` → build `packages/shared` + `apps/api` + `apps/web` (theo `turbo.json` task `build` không có filter). Hậu quả: (a) Docker image API build bị couple với web build — nếu web build fail (vd cần env `NEXT_PUBLIC_*` chưa set), API image không build được dù API không cần web; (b) waste ~15s+ build time + layer size cho web dist không dùng (runner stage chỉ copy `packages/shared/dist` + `apps/api/dist`, web dist bị bỏ). Dev log §3.4 cho build PASS hiện tại (web build không cần env bắt buộc), nhưng là latent risk.
- **Cách sửa:** Đổi thành build chỉ api + dependency tree:
  ```dockerfile
  RUN yarn turbo build --filter=@bdsai/api...
  ```
  (`...` include upstream deps = `@bdsai/shared`). Hoặc `yarn workspace @bdsai/api build` (nhưng cần đảm bảo shared build trước — turbo filter an toàn hơn).

### LOW

#### L1 — `deploy-web` double build (local `yarn build` + Vercel rebuild)
- **File:** `.github/workflows/deploy.yml:81-93`
- **Mô tả:** Job chạy `yarn build` (build web local) rồi `npx vercel deploy --prod --yes` (Vercel CLI mặc định build lại trên Vercel side). Double build, waste CI time. `ci-gate` đã verify build pass → local build ở đây thừa.
- **Cách sửa:** Bỏ step `Build web` (để Vercel build), hoặc giữ làm gate nhưng thêm `--no-build` cho vercel deploy (khó hơn với Next.js — Vercel cần build riêng). Khuyến nghị: bỏ local build, tin tưởng ci-gate + Vercel build.

#### L2 — Lighthouse job không wait propagation sau Vercel deploy
- **File:** `.github/workflows/deploy.yml:146-162`, `bdsai/.lighthouserc.js:22-25`
- **Mô tả:** Lighthouse chạy ngay sau `deploy-web` complete. Config dùng custom domain `https://bdsai.vn/` — Vercel assign deploy production cho custom domain nhanh nhưng CDN propagation có thể delay vài giây → Lighthouse có thể quét version cũ.
- **Cách sửa:** Thêm step `sleep 30` hoặc poll `curl -sI https://bdsai.vn/ | grep 200` retry trước Lighthouse CI.

#### L3 — `bdsai/apps/api/.dockerignore` không được Docker sử dụng (dead file)
- **File:** `bdsai/apps/api/.dockerignore`
- **Mô tả:** Docker chỉ đọc `.dockerignore` từ **build context root** = `bdsai/` → chỉ `bdsai/.dockerignore` có hiệu lực. File `apps/api/.dockerignore` không bao giờ được đọc. Story Task 2 yêu cầu tạo nó, nhưng functionally dead.
- **Cách sửa:** Giữ (theo story spec) nhưng thêm comment đầu file: "Docker chỉ dùng `.dockerignore` ở context root (`bdsai/.dockerignore`); file này giữ cho source-tree convention, không có hiệu lực khi build". Hoặc xóa + cập nhật story.

#### L4 — `actionlint` chưa cài → `workflow:validate` chỉ YAML parse, không bắt GitHub Actions-specific error
- **File:** `bdsai/scripts/validate-workflows.mjs:44-56`, dev log §7
- **Mô tả:** Script fallback python3 PyYAML chỉ verify YAML parse hợp lệ, KHÔNG bắt lỗi như: action version không tồn tại, thiếu `runs-on`, `${{ }}` expression sai, `needs` tham chiếu job không có. Dev log acknowledge.
- **Cách sửa:** Cài `brew install actionlint` local + thêm step CI chạy `actionlint` (hoặc dùng `reviewdog/action-actionlint` action trong CI). Không block story 1.3.

#### L5 — `validate-workflows.mjs` python3 fallback xây code qua shell string
- **File:** `bdsai/scripts/validate-workflows.mjs:62-73`
- **Mô tả:** `execSync(\`python3 -c "${pyCode}"\`, ...)` ghép Python code vào shell string. Input controlled (hardcoded trong file) nên không exploit, nhưng fragile nếu sau này pyCode chứa quote. Cosmetic.
- **Cách sửa:** Dùng `execFileSync('python3', ['-c', pyCode], { input: ... })` thay vì `execSync` string. Minor.

## 3. Bảng verify AC1–AC7

| AC | Trạng thái | Verify adversarial |
|---|---|---|
| AC1 CI workflow lint+typecheck+build+test cả 3 package qua Turborepo, trigger production+develop | ✅ | `ci.yml` trigger push+PR `production`+`develop`; `working-directory: bdsai`; `yarn install --immutable` → `yarn build/lint/typecheck/test`; cache `bdsai/yarn.lock`; corepack yarn 4.9.2. Build 3/3, lint 4/4, typecheck 4/4, test 11/11 PASS local. |
| AC2 Deploy trigger production CHỈ, web→Vercel CLI, api→Docker+GHCR+Dokploy webhook | ✅ | `deploy.yml` `on: push: branches: [production]` CHỈ. `deploy-web`: `npx vercel@latest deploy --prod --yes --token ${{ secrets.VERCEL_TOKEN }} --cwd apps/web` + env `VERCEL_ORG_ID`/`PROJECT_ID`. `deploy-api`: `docker/build-push-action` push `ghcr.io/<owner-lower>/bdsai-api:{latest,sha}` + curl Dokploy webhook (Bearer token). 2 job song song `needs: ci-gate`. |
| AC3 Gate — deploy needs ci-gate, fail CI → không deploy | ✅ | `deploy-web` + `deploy-api` đều `needs: ci-gate`. `ci-gate` chạy lại full lint+typecheck+build+test trong deploy workflow (không phụ thuộc cross-workflow race). Fail bất kỳ step → job fail → deploy job không chạy. |
| AC4 Lighthouse CI, SEO ≥ 90 trên / + /listings (skip detail TODO 3.4), post-deploy gate | ⚠️ PARTIAL | `.lighthouserc.js` assert `'categories:seo': ['error', { minScore: 0.9 }]` (error = fail job). Job `lighthouse needs: deploy-web` + `lighthouse-fail-issue if: failure()` tạo issue. **NHƯNG** URL `/listings` không tồn tại (xem M1) → gate `/listings` vô nghĩa/spurious. Gate `/` OK. |
| AC5 Secrets qua GitHub Secrets, không hardcode | ✅ | Grep verify CLEAN (match duy nhất là example command trong SECRETS.md). Tất cả secret qua `${{ secrets.* }}`. `GITHUB_TOKEN` auto-provided. Supabase prod secret KHÔNG qua GitHub (AD-5) — cấu hình trực tiếp trên Dokploy env, SECRETS.md ghi rõ. Docker history không bake secret. |
| AC6 Dockerfile multi-stage, node:22-alpine, EXPOSE 3101, HEALTHCHECK, build local OK | ✅ (với M3) | Multi-stage builder+runner, `node:22-alpine`, `yarn workspaces focus @bdsai/api --production`, `EXPOSE 3101`, `HEALTHCHECK /health/supabase` (wget), `CMD ["node","dist/main.js"]`. Build local SUCCESS (333MB). Smoke boot OK. **M3**: builder build cả web (AC6 spec "chỉ api + shared"). |
| AC7 Workflow syntax hợp lệ + Dockerfile build + yarn build/lint/typecheck/test PASS | ✅ | `yarn workflow:validate` PASS (YAML parse). Docker build SUCCESS. `yarn build/lint/typecheck/test` PASS. Script `workflow:validate` có thật (actionlint→PyYAML→js-yaml→structural). L4: actionlint chưa cài. |

## 4. Bảng verify invariant AD

| Invariant | Trạng thái | Verify |
|---|---|---|
| AD-1 (Module Isolation) | ✅ | Workflow chỉ build/deploy, không thêm logic nghiệp vụ. Không `supabase.from().insert()` trong workflow/Next route. |
| AD-4 (SSR Boundary) | ⚠️ | Lighthouse gate SEO ≥ 90 có (error level). Page `/` SSR/prerender OK. Page `/listings` chưa tồn tại → gate chưa bảo vệ đúng (M1). Skip `/listings/[id]` TODO 3.4 đúng story. |
| AD-5 (Auth Separation) | ✅ | CI không tham chiếu service-role key. Deploy không echo secret. Service-role key KHÔNG qua GitHub Secrets (chỉ Dokploy env) → không leak qua fork PR log. Web deploy env chỉ anon key (SECRETS.md ghi rõ). |
| AD-8 (Data Privacy & PII) | ✅ | GitHub Secrets, không hardcode (grep clean). Dockerfile không `ARG`/`ENV` secret (chỉ `NODE_ENV`, `API_PORT` không nhạy cảm). `docker history` không có secret. `.dockerignore` loại `.env*`. |
| AD-10 (Next API Route Boundary) | ✅ | Workflow không thêm business logic vào Next API routes. |

## 5. Bảo mật — check chuyên biệt

| Check | Kết quả |
|---|---|
| Hardcode secret trong workflow/Dockerfile/code | ✅ CLEAN (grep verify) |
| Docker image bake secret vào layer | ✅ CLEAN (`docker history` no match) |
| PR từ fork → không lộ secret | ✅ Deploy trigger `push: production` CHỈ (fork PR không trigger). CI không cần secret. |
| Service-role key không vào web deploy env | ✅ SECRETS.md + workflow chỉ dùng Vercel token cho web. |
| GitHub Actions echo secret trong step output | ✅ Không có step nào `echo $SECRET`. Dokploy webhook dùng shell env `$DOKPLOY_*` (không `${{ }}` inline trong run body ngoài image name không nhạy cảm). |

## 6. Kết luận + recommendation

**Verdict: APPROVED** — 0 critical, 0 high. Code an toàn, không phá 1.1/1.2, không hardcode secret, Docker không bake secret, workflow syntax hợp lệ (YAML), Dockerfile build OK.

**Fix trước production deploy đầu (MEDIUM, non-blocking cho review pass):**
1. **M1:** Xóa URL `/listings` khỏi `.lighthouserc.js` tới khi story 3.3 (hoặc tạo placeholder). Gate `/` là đủ cho 1.3.
2. **M2:** Thêm `permissions: packages: write` vào job `deploy-api` (đảm bảo GHCR push không 403).
3. **M3:** Đổi Dockerfile builder `yarn turbo build --filter=@bdsai/api...` (chỉ build shared+api, không build web).

**Nice-to-have (LOW):**
- L1: Bỏ double build ở `deploy-web`.
- L2: Thêm wait/propagation check trước Lighthouse.
- L3: Comment rõ `apps/api/.dockerignore` là dead (Docker dùng root context).
- L4: Cài `actionlint` + thêm vào CI.
- L5: Dùng `execFileSync` thay `execSync` string trong validate script.

**Handoff cho leader/e2e:**
- CI chạy thật trên GitHub UI: push branch test → confirm (ngoài scope dev local).
- Docker smoke 200: reviewer/e2e chạy `docker run --network host -e ...` với Supabase local → `curl /health/supabase` kỳ vọng 200.
- Cấu hình GitHub Secrets (SECRETS.md) + GHCR package settings trước production deploy đầu.
