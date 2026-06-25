# Story 1.3: CI/CD GitHub Actions → Vercel + Dokploy

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **pipeline CI/CD tự động deploy web lên Vercel và api lên Dokploy khi merge**,
so that **mỗi thay đổi được build, test, và deploy không cần thao tác thủ công**.

## Acceptance Criteria

> Nguồn: `epics.md` → Epic 1 → Story 1.3 (dòng 180-194, AC gốc Given/When/Then). AC dưới đây giữ nguyên ý định gốc, bổ sung tiêu chí kiểm chứng được + đánh số AC1–AC7. Quy ước test toàn dự án (dòng 144): "mỗi story phải kèm test tự động trước khi Done — Story 1.3 gate".

1. **AC1 — CI workflow chạy lint+typecheck+build+test cho cả 3 package qua Turborepo.** Given monorepo `bdsai/` có `packages/shared` → `apps/api` → `apps/web` (task `build` có `dependsOn: ["^build"]`), When push/PR vào nhánh `production` hoặc `develop`, Then GitHub Actions workflow `.github/workflows/ci.yml` chạy `yarn install` (frozen lockfile) → `yarn build` → `yarn lint` → `yarn typecheck` → `yarn test` (cả 3 package, theo topological order của Turborepo). Dùng Turborepo remote cache (hoặc local cache trong runner) để skip task khi input hash khớp. Job fail nếu bất kỳ task nào exit non-zero.

2. **AC2 — Deploy workflow trigger khi merge vào production: web→Vercel, api→Dokploy.** Given CI (AC1) pass trên nhánh `production`, When merge/push vào `production`, Then `.github/workflows/deploy.yml` chạy 2 job độc lập: (a) **web** deploy lên Vercel (qua Vercel CLI `vercel deploy --prod` với `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` từ GitHub Secrets, hoặc auto-deploy qua Vercel Git integration — chọn 1, ghi rõ trong Dev Notes), (b) **api** build Docker image từ `apps/api/Dockerfile` → push lên container registry → trigger Dokploy deploy qua webhook/API với `DOKPLOY_TOKEN`. Deploy CHỈ trigger trên `production`, KHÔNG trigger trên `develop` hay PR.

3. **AC3 — Pipeline fail (gate) nếu lint/typecheck/build/test lỗi — KHÔNG deploy khi CI fail.** Given workflow CI (AC1) hoặc bất kỳ pre-deploy check fail, When một task exit non-zero, Then toàn bộ pipeline dừng, deploy job KHÔNG chạy. Deploy job (AC2) phải `needs: [ci]` (hoặc chạy trong cùng workflow sau CI job) để đảm bảo gate. Lighthouse job (AC4) cũng là gate cho deploy production.

4. **AC4 — Lighthouse CI job chạy trên public pages, fail nếu SEO < 90 (AD-4, NFR3).** Given web đã deploy (preview hoặc production URL), When Lighthouse CI job chạy, Then quét 3 public pages: `/` (home), `/listings` (browse), `/listings/[id]` (detail — dùng 1 listing mẫu hoặc placeholder SSR page nếu chưa có data). Cấu hình qua `.lighthouserc.js` ở root `bdsai/` (hoặc repo root). Gate: SEO category score ≥ 90 trên TẤT CẢ 3 page; nếu bất kỳ page < 90 → job fail → chặn deploy production (AC3 gate). Lighthouse chạy sau khi web deploy xong (cần URL công khai).

5. **AC5 — Secrets qua GitHub Secrets, không hardcode.** Given mọi biến nhạy cảm (Supabase keys, OpenAI, Vercel token, Dokploy token, Docker registry creds), When workflow/Dockerfile/code tham chiếu secret, Then dùng `${{ secrets.X }}` trong workflow YAML và `ARG`/`ENV` trong Dockerfile (giá trị truyền lúc build/run, KHÔNG ghi literal). Verify bằng grep: KHÔNG có key/token thật nào xuất hiện literal trong `.github/workflows/`, `Dockerfile`, hoặc source. Danh sách GitHub Secrets cần cấu hình: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (prod), `OPENAI_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DOKPLOY_TOKEN`, `DOKPLOY_WEBHOOK_URL`, `DOCKER_REGISTRY_URL`, `DOCKER_REGISTRY_USER`, `DOCKER_REGISTRY_PASSWORD`.

6. **AC6 — Dockerfile multi-stage cho apps/api (build dist → runtime image nhỏ, expose 3101, healthcheck).** Given `apps/api` là NestJS 11 build bằng `nest build` → `dist/main.js` (script `start:prod: node dist/main.js`, port `3101`), When build Docker image, Then Dockerfile multi-stage: (1) **builder stage**: base `node:22-alpine`, install deps (yarn workspace), `yarn build` (chỉ api + shared), copy `dist/`; (2) **runtime stage**: `node:22-alpine`, copy chỉ `dist/` + `node_modules` prod + `package.json`, `EXPOSE 3101`, `CMD ["node", "dist/main.js"]`, `HEALTHCHECK` gọi `GET http://localhost:3101/health/supabase` (endpoint có từ Story 1.2). Image nhỏ (< 300MB lý tưởng). Build được local: `docker build -f apps/api/Dockerfile -t bdsai-api:test bdsai/` thành công, `docker run` khởi động được (cần env Supabase).

7. **AC7 — Workflow syntax hợp lệ + Dockerfile build được local.** Given workflow YAML + Dockerfile đã tạo, When verify, Then: (a) YAML parse hợp lệ (không syntax error), (b) `actionlint` (nếu cài được) pass trên cả `ci.yml` + `deploy.yml` + `lighthouse.yml` (hoặc job), (c) `docker build` Dockerfile thành công local, (d) `yarn build && yarn lint && yarn typecheck && yarn test` vẫn PASS ở `bdsai/` (không phá Story 1.1/1.2). Workflow test: KHÔNG cần test nghiệp vụ — chỉ verify syntax + build. Có thể thêm script `yarn workflow:validate` (chạy `actionlint` nếu có, fallback `yamllint`/node yaml parse).

## Tasks / Subtasks

- [ ] **Task 1 — CI workflow `.github/workflows/ci.yml` (AC1, AC3)**
  - [ ] Trigger: `on: [push, pull_request]` cho nhánh `production` + `develop` (dùng `branches: [production, develop]`).
  - [ ] Job `ci`: `runs-on: ubuntu-latest`, checkout (`actions/checkout@v4`), setup Node 22 (`actions/setup-node@v4` với `node-version: 22`), cache yarn (`cache: yarn` + `cache-dependency-path: bdsai/yarn.lock`).
  - [ ] `yarn install --immutable` ở `bdsai/` (frozen lockfile — fail nếu lockfile lệch).
  - [ ] Chạy qua Turborepo: `yarn build`, `yarn lint`, `yarn typecheck`, `yarn test` (thứ tự theo turbo task graph; `test` đã có `dependsOn: ["^build"]`).
  - [ ] (Optional) Setup Turborepo remote cache hoặc để local cache runner. Ghi rõ quyết định trong Dev Notes.
  - [ ] Mỗi step fail → job fail → pipeline dừng (gate AC3).
- [ ] **Task 2 — Dockerfile multi-stage cho apps/api (AC6)**
  - [ ] Tạo `bdsai/apps/api/Dockerfile`:
    - Builder stage: `FROM node:22-alpine AS builder`, copy `package.json` + `yarn.lock` + workspace manifests, `yarn install --immutable`, copy source `packages/shared` + `apps/api`, `yarn build` (shared + api).
    - Runtime stage: `FROM node:22-alpine AS runner`, copy `dist/` + `node_modules` (prod only) + `package.json` từ builder, `ENV NODE_ENV=production`, `EXPOSE 3101`, `HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3101/health/supabase || exit 1`, `CMD ["node", "dist/main.js"]`.
  - [ ] Tạo `bdsai/apps/api/.dockerignore` (loại trừ `node_modules`, `dist`, `.env`, `.turbo`, test files).
  - [ ] Verify local: `docker build -f apps/api/Dockerfile -t bdsai-api:test bdsai/` thành công.
- [ ] **Task 3 — Deploy workflow `.github/workflows/deploy.yml` (AC2, AC3, AC5)**
  - [ ] Trigger: `on: push: branches: [production]` CHỈ (KHÔNG develop, KHÔNG PR).
  - [ ] Job `deploy-web`: `needs: []` (hoặc chạy sau CI nếu gộp workflow — quyết định: tách file nên `needs` không áp dụng cross-workflow; dùng `workflow_run` hoặc gộp CI+deploy. **Quyết định chốt:** deploy.yml tách file, trigger `on: push: branches: [production]`, bên trong chạy lại CI gate (lint+typecheck+build) rồi deploy → đảm bảo gate không phụ thuộc cross-workflow). Setup Node 22, `yarn install --immutable`, `yarn build`, rồi `npx vercel deploy --prod --yes` (cần `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` qua env). Hoặc nếu dùng Vercel Git auto-deploy → job này chỉ wait/verify (chọn 1, ghi rõ).
  - [ ] Job `deploy-api`: build Docker image (`docker build -f apps/api/Dockerfile -t $DOCKER_REGISTRY_URL/bdsai-api:${{ github.sha }} bdsai/`), `docker login` với `DOCKER_REGISTRY_USER`/`PASSWORD`, `docker push`, rồi gọi Dokploy webhook (`curl -X POST $DOKPLOY_WEBHOOK_URL -H "Authorization: Bearer $DOKPLOY_TOKEN"` hoặc Dokploy API deploy endpoint).
  - [ ] `deploy-web` và `deploy-api` chạy song song (độc lập — nếu api fail, web vẫn deploy được và ngược lại, per edge case).
  - [ ] Tất cả secret qua `${{ secrets.X }}`. KHÔNG literal.
- [ ] **Task 4 — Lighthouse CI config + job (AC4)**
  - [ ] Tạo `bdsai/.lighthouserc.js` (hoặc repo root): `ci.collect.url` = 3 public pages (`/`, `/listings`, `/listings/[id]` — dùng URL production hoặc preview; nếu chưa có listing data thật, dùng placeholder SSR page hoặc skip detail với ghi chú). `ci.assert.assertions` = `{ 'categories:seo': ['warn', { minScore: 0.9 }] }` (0.9 = 90). Lighthouse CI action: `treosh/lighthouse-ci-action@v11` hoặc `github/action` tương đương.
  - [ ] Job `lighthouse` trong `deploy.yml` (sau `deploy-web` để có URL) hoặc workflow riêng `.github/workflows/lighthouse.yml` trigger sau deploy. **Quyết định chốt:** job trong `deploy.yml`, `needs: [deploy-web]`, chạy trên URL production. Fail → chặn (nhưng web đã deploy — ghi chú: Lighthouse là post-deploy gate, cảnh báo + tạo issue; nếu muốn pre-deploy thì dùng Vercel preview URL. Chốt: post-deploy gate + fail tạo GitHub issue + comment trên PR).
  - [ ] Nếu SEO < 90 trên bất kỳ page → exit 1.
- [ ] **Task 5 — GitHub Secrets documentation (AC5)**
  - [ ] Tạo `bdsai/.github/SECRETS.md` (hoặc section trong README) liệt kê tên secret + mô tả + nơi lấy giá trị. KHÔNG ghi giá trị thật.
  - [ ] Verify grep: `grep -rE "(eyJ|sk-|supabase_service_role|postgres://)" .github/ apps/api/Dockerfile` → KHÔNG match literal secret (chỉ placeholder/`${{ secrets.* }}`).
- [ ] **Task 6 — Workflow validation script + test (AC7)**
  - [ ] Thêm script `workflow:validate` vào `bdsai/package.json`: chạy `actionlint` (nếu có) trên `.github/workflows/*.yml`, fallback `yamllint` hoặc node `yaml.parse`.
  - [ ] Verify: `docker build` Dockerfile thành công local, `yarn build && yarn lint && yarn typecheck && yarn test` PASS ở `bdsai/`.
- [ ] **Task 7 — Smoke test end-to-end (AC7)**
  - [ ] (Local) `docker build` + `docker run -e DATABASE_URL=... -e SUPABASE_URL=... bdsai-api:test` → `curl http://localhost:3101/health/supabase` trả 200 (cần Supabase local chạy).
  - [ ] (CI syntax) Push branch test → GitHub Actions chạy CI workflow, verify job chạy không syntax error (reviewer/leader confirm trên GitHub UI — ngoài scope dev local, ghi chú handoff).

## Dev Notes

### Bối cảnh dự án (BẮT BUỘC đọc trước khi code)
- Dự án: **bdsai.vn** — sàn rao vặt BĐS AI khu vực Long Thành. **KHÔNG** phải Twenty CRM. Code Twenty ở `packages/twenty-*` chỉ là tham khảo — **KHÔNG đụng tới**.
- Codebase thật nằm tại **`bdsai/`** (greenfield, scaffold xong Story 1.1, Supabase kết nối xong Story 1.2). Mọi đường dẫn dưới đây tương đối từ repo root trừ khi ghi rõ.
- Kiến trúc 3 tầng Layered-Modular: Presentation (Next.js 16, Vercel) → Application (NestJS 11, Dokploy Docker) → Data (Supabase + Redis). [Source: ARCHITECTURE-SPINE.md#Design-Paradigm, #Deployment]
- ⚠️ **Workflow files đặt ở `.github/workflows/` ở REPO ROOT** (KHÔNG phải `bdsai/.github/` — GitHub Actions chỉ nhận diện workflow ở root `.github/workflows/`). Tuy nhiên config file như `.lighthouserc.js`, `Dockerfile`, `SECRETS.md` có thể ở `bdsai/`. Workflow path tham chiếu `bdsai/` khi chạy lệnh (vd `working-directory: bdsai` hoặc `cd bdsai &&`).

### Trạng thái từ Story 1.1 + 1.2 (đã DONE — KHÔNG làm lại)
- Monorepo Turborepo chạy: `apps/web` (Next.js 16.2.9 / React 19), `apps/api` (NestJS 11.1.27), `packages/shared` (`@bdsai/shared`, Zod 3.25.76).
- `turbo.json` tasks: `dev` (persistent, no cache), `build` (`dependsOn: ["^build"]`, outputs `.next/**`, `dist/**`), `lint` (`dependsOn: ["^build"]`), `typecheck` (`dependsOn: ["^build"]`), `test` (`dependsOn: ["^build"]`, outputs `coverage/**`), `clean` (no cache). [Source: bdsai/turbo.json]
- Scripts (root `bdsai/package.json`): `yarn build/lint/typecheck/test` chạy qua turbo cho cả 3 package. Verified PASS ở 1.2: `yarn build` 3/3, `typecheck` 4/4, `lint` 4/4, `test` 3/3 (api 11 unit pass). [Source: harness-workspace/1-2.../02-dev.md §3.7]
- `apps/api` scripts: `build: nest build`, `start:prod: node dist/main.js`, `test: jest --passWithNoTests`, `test:e2e`, `db:generate/migrate`. Port `3101`. [Source: bdsai/apps/api/package.json]
- `apps/web` scripts: `dev: next dev -p 3100`, `build: next build`, `test: echo "no web unit tests yet" && exit 0`. Port `3100`. [Source: bdsai/apps/web/package.json]
- `apps/api/src/health/health.controller.ts` có `GET /health/supabase` → 200 `{db, auth, storage}` (dùng cho Docker HEALTHCHECK). [Source: 1-2.../02-dev.md §3.5]
- Env mẫu: `bdsai/.env.example` (root) + `bdsai/apps/api/.env.example`. Biến: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_PORT`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `DB_POOL_MAX`, `DB_IDLE_TIMEOUT`. [Source: bdsai/.env.example, apps/api/.env.example]
- Port Supabase local: dải 5435x (API 54351, DB 54352, Studio 54353). [Source: 1-1.../00-infra-decisions.md]
- Node v22.22.3, npm 10.9.8, Docker 29.4.0, yarn 4.9.2 (corepack). [Source: 1-1.../00-infra-decisions.md]

### Quyết định kiến trúc nhỏ (tự chốt — ghi rõ trong PR)
1. **CI workflow** `.github/workflows/ci.yml`: trigger push/PR nhánh `production` + `develop`. Chạy lint+typecheck+build+test cả 3 package qua Turborepo. Dùng `yarn install --immutable` (frozen lockfile).
2. **Deploy workflow** `.github/workflows/deploy.yml`: tách file, trigger `on: push: branches: [production]` CHỈ. Bên trong chạy lại CI gate (lint+typecheck+build) rồi 2 job song song: `deploy-web` (Vercel CLI) + `deploy-api` (Docker build+push+Dokploy webhook). Lý do tách + chạy lại CI gate: đảm bảo gate không phụ thuộc cross-workflow `workflow_run` (race condition, reorder). CHỈ trigger production (develop = staging, không auto-deploy).
3. **Vercel deploy**: dùng **Vercel CLI** (`vercel deploy --prod --yes`) thay vì auto Git integration — kiểm soát explicit trong workflow, logs trong GitHub Actions. Cần `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`.
4. **Dokploy deploy**: build Docker image → push registry (GHCR hoặc Docker Hub — chốt **GHCR** `ghcr.io/<owner>/bdsai-api` vì tích hợp GitHub Auth sẵn, không cần thêm registry secret ngoài `GITHUB_TOKEN` mặc định) → gọi Dokploy API/webhook trigger redeploy. Cần `DOKPLOY_TOKEN` + `DOKPLOY_WEBHOOK_URL` (hoặc Dokploy application ID).
5. **Lighthouse CI**: job `lighthouse` trong `deploy.yml`, `needs: [deploy-web]`, chạy trên URL production. **Post-deploy gate**: nếu SEO < 90 → exit 1 + tạo GitHub issue (không rollback web đã deploy — ghi chú rõ). Config `.lighthouserc.js` ở `bdsai/`. 3 page: `/`, `/listings`, `/listings/[id]`. Nếu `/listings/[id]` chưa có data thật (story 3.4 mới có detail SSR) → dùng placeholder hoặc skip với `--skip` + ghi chú TODO; **chốt: skip detail page ở story 1.3, chỉ gate `/` + `/listings`** (2 page đã có SSR placeholder từ 1.1/1.2 prerender). Ghi TODO cho story 3.4 thêm detail vào Lighthouse.
6. **Secrets**: GitHub Secrets (danh sách AC5). KHÔNG hardcode. Docker registry = GHCR dùng `${{ secrets.GITHUB_TOKEN }}` (auto-provided, không cần cấu hình thêm).
7. **Docker**: `apps/api/Dockerfile` multi-stage (builder + runner), `node:22-alpine`, expose 3101, healthcheck `/health/supabase`.
8. **Test workflow**: `yarn workflow:validate` (actionlint nếu có, fallback yaml parse). Không test nghiệp vụ cho workflow.

### Invariants áp dụng (BẮT BUỘC tuân — vi phạm = review fail)
- **AD-4 (SSR Boundary):** Lighthouse CI gate SEO ≥ 90 trên public pages. Pages `/`, `/listings`, `/listings/[id]` MUST server-render. CI pipeline chạy Lighthouse mỗi deploy production; FAIL nếu SEO < 90 (verify NFR3, không chỉ mục tiêu). [Source: ARCHITECTURE-SPINE.md#AD-4]
- **AD-5 (Auth Separation):** Secrets Supabase (service-role key) KHÔNG lộ trong CI log. GitHub Actions log có thể public (fork PR) → KHÔNG in secret trong step output. Dùng `::add-mask::` hoặc tránh echo. Service-role key chỉ ở backend (apps/api env), KHÔNG đưa vào web deploy. [Source: ARCHITECTURE-SPINE.md#AD-5]
- **AD-8 (Data Privacy & PII):** GitHub Secrets, không hardcode. Redact trong log. Docker image KHÔNG bake secret vào layer — truyền env lúc `docker run` (runtime), KHÔNG `ENV` literal trong Dockerfile. Audit: grep verify không có key literal. [Source: ARCHITECTURE-SPINE.md#AD-8]
- **AD-1 (Module Isolation):** CI/CD không vi phạm module boundary — chỉ build/deploy, không thêm logic nghiệp vụ vào workflow. [Source: ARCHITECTURE-SPINE.md#AD-1]
- **AD-10 (Next.js API Route Boundary):** Deploy web không thêm business logic vào Next API routes qua CI. [Source: ARCHITECTURE-SPINE.md#AD-10]

### Consistency conventions (BẮT BUỌC) [Source: ARCHITECTURE-SPINE.md#Consistency-Conventions]
- Files **kebab-case** (`ci.yml`, `deploy.yml`, `lighthouserc.js`). Workflow job names snake/kebab.
- Config: env qua GitHub Secrets (CI) + `.env` (local). KHÔNG hardcode.
- Logging: workflow step KHÔNG echo secret. Docker build log KHÔNG in `DATABASE_URL` (dùng `--secret` BuildKit nếu cần secret lúc build, hoặc truyền runtime).
- Naming: Docker image `ghcr.io/<owner>/bdsai-api:<sha>` (lowercase, kebab).

### Versions (theo stack doc + môi trường đã verify)
| Tool | Version | Ghi chú |
|---|---|---|
| Node.js | 22 LTS | Runner `ubuntu-latest` + `actions/setup-node@v4` |
| yarn | 4.9.2 | corepack, `--immutable` |
| Turborepo | (qua yarn workspace) | `turbo.json` đã có từ 1.1 |
| Docker | (runner có sẵn) | `ubuntu-latest` incl. docker |
| GitHub Actions | `actions/checkout@v4`, `actions/setup-node@v4` | |
| Vercel CLI | latest | `npx vercel@latest deploy --prod` |
| Lighthouse CI | `treosh/lighthouse-ci-action@v11` | hoặc tương đương |
| actionlint | latest (optional) | `brew install actionlint` local |
| Dokploy | 0.18.x | Backend deploy (Docker) [Source: ARCHITECTURE-SPINE.md#Stack] |
[Source: ARCHITECTURE-SPINE.md#Stack, 1-1.../00-infra-decisions.md]

### Source tree — file sẽ tạo/sửa
**NEW (repo root `.github/workflows/`):**
- `.github/workflows/ci.yml` — CI gate (lint+typecheck+build+test)
- `.github/workflows/deploy.yml` — Deploy (web Vercel + api Dokploy) + Lighthouse job
**NEW (trong `bdsai/`):**
- `bdsai/apps/api/Dockerfile` — multi-stage build NestJS → dist
- `bdsai/apps/api/.dockerignore` — loại trừ node_modules/dist/.env/test
- `bdsai/.lighthouserc.js` — Lighthouse CI config (3 public pages, SEO ≥ 90)
- `bdsai/.github/SECRETS.md` — danh sách GitHub Secrets + hướng dẫn cấu hình (KHÔNG giá trị thật)
**UPDATE:**
- `bdsai/package.json` — thêm script `workflow:validate` (actionlint/yaml parse)
[Source: ARCHITECTURE-SPINE.md#Structural-Seed — `.github/workflows/`, `apps/api/Dockerfile`]

### Edge cases cần xử lý
- **PR từ fork → không chạy deploy** (chỉ CI): GitHub Actions KHÔNG expose `secrets.*` cho PR từ fork (bảo mật mặc định). Workflow deploy trigger `on: push: branches: [production]` CHỈ → fork PR (vào nhánh khác) không trigger deploy. CI workflow chạy cho PR nhưng `secrets` rỗng → CI không cần secret (chỉ build/test), OK. Thêm `if: github.event.pull_request.head.repo.full_name == github.repository` nếu cần giới hạn CI cho same-repo PR (optional).
- **Lighthouse fail nhưng build pass → vẫn chặn (gate):** Lighthouse job `needs: [deploy-web]`, exit 1 nếu SEO < 90. Vì deploy đã chạy (post-deploy), "chặn" = tạo GitHub issue + comment + fail workflow (cảnh báo). KHÔNG rollback tự động (Vercel không có rollback CLI đơn giản). Ghi chú rõ: đây là post-deploy quality gate, không pre-deploy block.
- **Turborepo cache hit → CI nhanh nhưng vẫn phải chạy test:** Turbo cache `test` theo input hash. Nếu cache hit, test skip. **Quyết định:** tin tưởng turbo cache cho `test` (input hash khớp = code không đổi = test pass). Nếu reviewer muốn force test mọi lần → thêm `--force` hoặc tách test ra khỏi cache. Chốt: trust cache (nhanh), ghi chú TODO nếu cần force.
- **Docker build fail → không deploy api, web vẫn deploy được:** `deploy-web` và `deploy-api` song song (không `needs` nhau). Api fail → web vẫn deploy. Edge case: nếu muốn api fail chặn web → thêm `needs: [deploy-api]` cho deploy-web. **Chốt:** độc lập (web không phụ thuộc api) — user vẫn xem được web tĩnh dù api down.
- **Supabase env thiếu trong CI → test integration skip hoặc fail rõ:** CI `yarn test` chạy unit (không cần Supabase). `test:e2e` cần Supabase — CI KHÔNG chạy e2e (chỉ local, e2e cần Supabase local chạy). Nếu CI có e2e sau này → skip nếu env thiếu (`--passWithNoTests` hoặc conditional). KHÔNG giả vờ pass.
- **Vercel deploy fail (token sai/quota):** job `deploy-web` fail, workflow fail, tạo issue. Api deploy vẫn chạy (độc lập).
- **Dokploy webhook fail (server down/token sai):** job `deploy-api` fail, image đã push registry nhưng Dokploy không redeploy. Ghi chú: image ở registry sẵn sàng, retry webhook thủ công hoặc Dokploy auto-pull.
- **Secret leak trong log:** nếu step vô tình echo secret → GitHub auto-mask giá trị thành `***` trong log (nếu secret đã khai báo). Nhưng tránh chủ ý echo. Docker build: KHÔNG `ARG DATABASE_URL` rồi `ENV DATABASE_URL=$ARG` (sẽ bake vào layer history) — truyền runtime `docker run -e DATABASE_URL=...`.

### Testing standards
- Workflow test: KHÔNG test nghiệp vụ. Verify (a) YAML syntax (actionlint/yaml parse), (b) Dockerfile build local, (c) `yarn build/lint/typecheck/test` vẫn PASS.
- Story chỉ Done khi: workflow syntax hợp lệ + Dockerfile build được + CI chạy thật trên GitHub (reviewer/leader confirm trên UI — handoff).
- Quy ước test toàn dự án (dòng 144 epics.md): Story 1.3 chính là CI gate — sau story này, MỌI story sau phải pass CI trước khi Done. [Source: epics.md#Quy-ước-test]

### Project Structure Notes
- Workflow files ở **repo root `.github/workflows/`** (KHÔNG `bdsai/.github/workflows/` — GitHub không nhận diện). Config files (`.lighthouserc.js`, `Dockerfile`, `SECRETS.md`) ở `bdsai/`.
- Dockerfile ở `bdsai/apps/api/Dockerfile` (khớp Structural Seed). Build context = `bdsai/` (để copy `packages/shared`).
- KHÔNG tạo workflow cho Track B (Epic 5) — ngoài scope.
- Lighthouse skip `/listings/[id]` ở story 1.3 (chưa có SSR detail page thật — story 3.4). TODO ghi rõ cho story 3.4 thêm vào.

### References
- [Source: docs/bdsai/planning/epics.md#Story-1.3] — AC gốc Given/When/Then (dòng 180-194)
- [Source: docs/bdsai/planning/epics.md#Quy-ước-test] — bắt buộc test mỗi story, Story 1.3 là CI gate (dòng 144)
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-4] — SSR Boundary, Lighthouse gate SEO ≥ 90
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-5] — Auth Separation, secret không lộ
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-8] — Data Privacy & PII, GitHub Secrets, redact
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-1] — Module Isolation
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#AD-10] — Next.js API Route Boundary
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Consistency-Conventions] — naming, config, logging
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Stack] — Node 22, NestJS 11, Vercel, Dokploy 0.18, GitHub Actions
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Structural-Seed] — `.github/workflows/`, `apps/api/Dockerfile`
- [Source: docs/bdsai/architecture/ARCHITECTURE-SPINE.md#Deployment] — Vercel FE + Dokploy Docker BE
- [Source: _bmad-output/harness-workspace/1-1-khoi-tao-monorepo-turborepo/00-infra-decisions.md] — port 5435x, vị trí code `bdsai/`, Node 22, Docker 29.4
- [Source: _bmad-output/harness-workspace/1-2-ket-noi-supabase/02-dev.md] — trạng thái apps/api + apps/web, scripts, `/health/supabase` endpoint, build/typecheck/lint/test PASS
- [Source: bdsai/turbo.json] — tasks build/lint/typecheck/test (dependsOn ^build)
- [Source: bdsai/apps/api/package.json] — scripts build/start:prod/test, port 3101
- [Source: bdsai/apps/web/package.json] — scripts build/dev, port 3100
- [Source: bdsai/packages/shared/package.json] — @bdsai/shared build
- [Source: bdsai/.env.example, bdsai/apps/api/.env.example] — biến env cần thiết
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/EXPERIENCE.md#Foundation] — public pages SSR `/`, `/listings`, `/listings/[id]` (Lighthouse target)
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — story queue (1.1 done, 1.2 done, 1.3 backlog → ready-for-dev)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
