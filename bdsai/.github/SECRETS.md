# bdsai.vn — GitHub Secrets (Story 1.3, AC5, AD-8)

Danh sách GitHub Secrets cần cấu hình cho CI/CD. **KHÔNG ghi giá trị thật ở đây**
— file này chỉ liệt kê tên + mô tả + nơi lấy. Giá trị cấu hình qua
GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

> AD-8 (Data Privacy & PII): mọi biến nhạy cảm qua GitHub Secrets, KHÔNG hardcode
> trong workflow/Dockerfile/source. Docker image KHÔNG bake secret vào layer —
> truyền env runtime qua `docker run -e`.

## CI workflow (`ci.yml`)

CI KHÔNG cần secret nghiệp vụ — chỉ build/lint/typecheck/test.
PR từ fork: GitHub KHÔNG expose `secrets.*` (bảo mật mặc định) → CI vẫn chạy OK.

## Deploy workflow (`deploy.yml`)

### Vercel (deploy-web)
| Secret | Mô tả | Nơi lấy |
|---|---|---|
| `VERCEL_TOKEN` | Vercel access token (deploy qua CLI) | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel team/org ID | Vercel project `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Vercel project ID (apps/web) | Vercel project `.vercel/project.json` → `projectId` |

### Docker registry — GHCR (deploy-api)
| Secret | Mô tả | Nơi lấy |
|---|---|---|
| `GITHUB_TOKEN` | Auto-provided bởi GitHub Actions (KHÔNG cần tạo thủ công) | `${{ secrets.GITHUB_TOKEN }}` — mặc định |

> Image: `ghcr.io/<owner>/bdsai-api:<sha>` (lowercase). Dùng `GITHUB_TOKEN` để
> login + push. Cần đảm bảo package settings cho phép workflow push (Package
> settings → Manage Actions access → repo).

### Dokploy (deploy-api)
| Secret | Mô tả | Nơi lấy |
|---|---|---|
| `DOKPLOY_WEBHOOK_URL` | Dokploy deploy webhook/API endpoint | Dokploy server → Application → Deploy webhook |
| `DOKPLOY_TOKEN` | Dokploy API token (Bearer) | Dokploy → Settings → API tokens |

### Runtime env (truyền cho `docker run` trên Dokploy, KHÔNG qua GitHub)
Các biến Supabase prod KHÔNG đưa vào GitHub Secrets để tránh leak qua fork PR log
(AD-5). Cấu hình trực tiếp trên Dokploy application env:
| Biến | Ghi chú |
|---|---|
| `DATABASE_URL` | Supabase Cloud pooler (port 6543, prepare:false) |
| `SUPABASE_URL` | Supabase Cloud API URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **CHỈ backend** — KHÔNG đưa vào web deploy (AD-5) |
| `SUPABASE_STORAGE_BUCKET` | Bucket listings |
| `DB_POOL_MAX` | Supabase Free pool cap |
| `DB_IDLE_TIMEOUT` | Idle timeout |
| `API_PORT` | 3101 |
| `OPENAI_API_KEY` | (Story 4.1+) AI summary |

## Verify không hardcode (AC5)

```sh
grep -rE "(eyJ|sk-|supabase_service_role|postgres://postgres:postgres)" \
  .github/workflows/ bdsai/apps/api/Dockerfile
```
→ chỉ match placeholder/comment/`${{ secrets.* }}`, KHÔNG match literal key thật.

## Bảo mật log (AD-5)

- Workflow step KHÔNG `echo` secret. GitHub auto-mask giá trị đã khai báo thành `***`
  nhưng tránh chủ ý in ra.
- Docker build: KHÔNG `ARG DATABASE_URL` rồi `ENV DATABASE_URL=$ARG` (bake vào layer
  history). Truyền runtime `docker run -e DATABASE_URL=...`.
- Service-role key CHỈ ở backend (apps/api env trên Dokploy), KHÔNG đưa vào web
  deploy (Vercel env chỉ anon key).
