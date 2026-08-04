# Frontend-Pilot Code Audit — bdsai.vn

**Mục tiêu:** Xác định các phần backend/modules/frontend routes thừa so với mục tiêu "bdsai hiện tại chỉ mới phát triển phần frontend".

**Phạm vi audit:** `apps/api/src` + `apps/web`.

---

## Kết luận đầu ra (TL;DR)

| Loại | Số lượng | Đề xuất |
|---|---|---|
| Backend module KHÔNG cần cho pilot frontend | 6 | Tắt/remove: `xaction`, `import`, `news`, `nowing`, `deal-radar`, `ai` (processor phần lớn) |
| Backend module CẦN giữ | 5 | `auth`, `marketplace`, `upload`, `inquiry`, `admin` (mỏng) |
| Frontend page KHÔNG cần | 4 | `news`, `cross-posts`, `inquiries` dashboard, `admin/*` |
| Frontend page CẦN giữ | 8 | trang chủ, `/listings`, `/listings/[id]`, `/login`, `/register`, `/profile`, `/about`, `/terms`, `/privacy` |
| Env vars thừa | ~15 | Bỏ `XACTIONS_*`, `NOWING_*`, `OPENAI_*`, `RESEND_*` nếu không dùng |
| Migration thừa | ~10 | Có thể giữ (DDL vô hại), nhưng schema `cross_posts`, `imported_listings`, `news_articles`, `deal_radar_*` không cần seed |

---

## 1. Backend modules audit

### 1.1 Giữ — cần cho frontend pilot

| Module | Lý do giữ | Routes quan trọng |
|---|---|---|
| `AuthModule` | Login, register, refresh, profile | `/auth/*`, `/me` |
| `MarketplaceModule` | Danh sách tin, chi tiết tin, search, approve/reject (admin), CRUD seller | `/marketplace/*` |
| `UploadModule` | Upload ảnh listing/avatar | `/upload/*` |
| `InquiryModule` | Form liên hệ trên listing detail | `/inquiries` |
| `AdminModule` | Duyệt tin, ban user | `/admin/*` |
| `HealthModule` | Health check, monitoring | `/health` |

### 1.2 Thừa — KHÔNG cần cho pilot frontend

| Module | Lý do thừa | Rủi ro nếu giữ |
|---|---|---|
| `XactionModule` | Cross-post Facebook/Zalo/Chợ Tốt — out of scope PRD v3.0 | Yêu cầu env `XACTIONS_API_TOKEN`, provider registry, queue phức tạp; lỗi console ở startup |
| `ImportModule` | Admin import CSV/JSON — out of scope | Schema `imported_listings`, dedup service, admin routes |
| `NewsModule` | News feed BĐS — PRD FR21 nhưng không phục vụ pilot core | Schema `news_articles`, admin/news routes, frontend `/news` |
| `NowingModule` | Nowing engine client — cần khi có AI rewrite/summary/match, nhưng chưa có contract | `NOWING_ENGINE_URL`, `NOWING_ENGINE_API_KEY`, cache Redis thừa |
| `DealRadarModule` | Vừa tạo, chưa có UI, chưa có Zalo trigger | Schema `deal_radar_*`, migration 0017, service test |
| `AiModule` | AI summary + trust score + spam filter + appeal | Yêu cầu Nowing/OpenAI, `OPENAI_*` env, processor queue |

### 1.3 Linh tinh

| File/Module | Ghi chú |
|---|---|
| `queue/*` | Cần nếu giữ `AiModule`/`XactionModule`, có thể mỏng hoặc thay bằng in-process promise |
| `notification/*` | Cần nếu có inquiry email, nhưng Resend env thường thiếu; có thể stub |

---

## 2. Frontend pages audit

### 2.1 Giữ

| Route | Lý do |
|---|---|
| `/` | Landing page |
| `/listings` | Browse + search listings |
| `/listings/[id]` | Listing detail + inquiry form |
| `/login`, `/register` | Auth |
| `/profile` | User profile |
| `/about`, `/terms`, `/privacy` | Public static |

### 2.2 Thừa / chưa cần

| Route | Lý do thừa |
|---|---|
| `/news` | News feed không phục vụ pilot |
| `/dashboard/inquiries` | Dashboard inquiry chưa có design rõ |
| `/dashboard/cross-posts` | Xaction out of scope |
| `/dashboard/my-listings` | Có thể giữ, nhưng `/dang-tin` đã tạo tin; chưa rõ UX |
| `/admin/*` | Cần nhưng có thể delay sau pilot |

---

## 3. Schema / migrations thừa

| Bảng/Migration | Đề xuất |
|---|---|
| `cross_posts` (0013) | Không cần nếu bỏ Xaction |
| `imported_listings` (0015) | Không cần nếu bỏ Import |
| `news_articles` (0016) | Không cần nếu bỏ News |
| `deal_radar_filters/alerts` (0017) | Không cần nếu bỏ DealRadar |
| `ai_results`, `appeal_requests`, `spam_config` | Không cần nếu bỏ AiModule |
| `user_audit_logs` (0009) | Có thể giữ nhẹ |

---

## 4. Env vars thừa (nếu bỏ các module trên)

```
XACTIONS_API_TOKEN
XACTIONS_API_URL
XACTION_ENABLED_PROVIDERS
NOWING_ENGINE_URL
NOWING_ENGINE_API_KEY
NOWING_ENGINE_TIMEOUT_MS
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_MODEL
RESEND_API_KEY
RESEND_FROM_EMAIL
```

---

## 5. Hành động đề xuất (theo thứ tự an toàn)

1. **Tắt module trong `app.module.ts`** (comment out `XactionModule`, `ImportModule`, `NewsModule`, `NowingModule`, `DealRadarModule`, `AiModule`).
2. **Xóa routes tương ứng trong `apps/web/app/api`** (tránh build error).
3. **Cập nhật `env.validation.ts`** để các env thừa không bắt buộc.
4. **Xóa schema files không dùng** (hoặc giữ nhưng không export).
5. **Xóa migration SQL tương ứng** (hoặc để lại, không apply cho DB pilot).
6. **Xóa frontend pages không dùng** (`/news`, `/dashboard/cross-posts`, `/dashboard/inquiries`).

---

## 6. Lưu ý quan trọng

- **Không nên xóa `marketplace`**, đó là core.
- **Không nên xóa `auth`**, frontend cần login/register.
- **Nếu giữ `inquiry`**, cần `notification` để gửi email; nếu không, inquiry chỉ lưu DB.
- `AiModule` có `GET /ai/listings/:id` được dùng ở listing detail? Cần kiểm tra frontend calls.
- Tất cả thay đổi cần chạy `yarn typecheck` + `yarn test` + `yarn build` trước commit.

---

## 7. Frontend → API dependencies cần chú ý

| Frontend route | API call | Module cần |
|---|---|---|
| `/listings/[id]` | `GET /ai/listings/:id` (AI summary) | `AiModule` — **cần giữ hoặc stub** |
| `/listings` | `GET /marketplace/search` | `MarketplaceModule` — giữ |
| `/dashboard/dang-tin` | `POST /marketplace/listings` | `MarketplaceModule` — giữ |
| `/dashboard/my-listings` | `GET /marketplace/my-listings` | `MarketplaceModule` — giữ |
| `/dashboard/cross-posts` | `GET/POST/PATCH/DELETE /xaction/*` | `XactionModule` — thừa |
| `/news` | `GET /news` | `NewsModule` — thừa |

### Quyết định bổ sung

- **NẾU bỏ `AiModule`**, phải sửa `app/(public)/listings/[id]/page.tsx` dòng 111 để không gọi `/ai/listings/${id}`, hoặc thay bằng stub trả summary rỗng.
- **NẾU bỏ `NewsModule`**, phải xóa `/news` page và site-header link `Tin tức`.
- **NẾU bỏ `XactionModule`**, phải xóa `/dashboard/cross-posts` page và route handlers.

---

## 8. Danh sách file có thể xóa / vô hiệu hóa (chi tiết)

### Backend (apps/api/src)

```
# Xóa toàn bộ nếu bỏ module:
- src/xaction/**          (trừ impact lên tests)
- src/import/**
- src/news/**
- src/nowing/**
- src/deal-radar/**
- src/ai/**               (cần sửa frontend listing detail nếu xóa)

# Giữ nhưng có thể mỏng:
- src/notification/**     (nếu inquiry vẫn gửi email)
- src/queue/**            (nếu bỏ ai/xaction thì queue ít dùng)

# Giữ:
- src/auth/**
- src/marketplace/**
- src/upload/**
- src/inquiry/**
- src/admin/**
- src/health/**
- src/db/**
- src/common/**
- src/config/**
- src/supabase/**
```

### Frontend (apps/web)

```
# Xóa:
- app/(public)/news/page.tsx
- app/api/news/route.ts
- app/api/admin/news/**/**
- app/(dashboard)/dashboard/cross-posts/**
- app/api/xaction/**
- app/(dashboard)/dashboard/inquiries/page.tsx   (nếu chưa dùng)
- components/shared/site-header.tsx: xóa link 'Tin tức'

# Giữ:
- app/(public)/page.tsx
- app/(public)/listings/page.tsx
- app/(public)/listings/[id]/page.tsx
- app/(auth)/**
- app/(public)/profile/**
- app/(public)/about|terms|privacy
- app/(dashboard)/dashboard/dang-tin/**
- app/(dashboard)/dashboard/my-listings/**
- app/(admin)/**                           (có thể delay)
```

### Schema / Migrations

```
# Bỏ export (hoặc xóa file):
- src/db/schema/cross-posts.ts
- src/db/schema/imported-listings.ts
- src/db/schema/news-articles.ts
- src/db/schema/ai-results.ts
- src/db/schema/appeal-requests.ts
- src/db/schema/spam-config.ts
- src/db/schema/deal-radar-filters.ts
- src/db/schema/deal-radar-alerts.ts
- src/db/schema/moderation-audit-logs.ts   (nếu bỏ ai/spam)

# Có thể giữ nhưng không dùng:
- src/db/schema/user-audit-logs.ts

# Migration SQL:
- src/db/migrations/0006_audit_log.sql       (nếu bỏ audit)
- src/db/migrations/0007_ai_results.sql      (nếu bỏ ai)
- src/db/migrations/0008_inquiries.sql       (giữ nếu giữ inquiry)
- src/db/migrations/0009_user_audit_logs.sql (có thể giữ)
- src/db/migrations/0011_spam_config.sql     (nếu bỏ ai/spam)
- src/db/migrations/0012_appeal_requests.sql (nếu bỏ ai)
- src/db/migrations/0013_cross_posts.sql     (nếu bỏ xaction)
- src/db/migrations/0014_cross_post_assisted_status.sql (nếu bỏ xaction)
- src/db/migrations/0015_imported_listings.sql (nếu bỏ import)
- src/db/migrations/0016_news_articles.sql   (nếu bỏ news)
- src/db/migrations/0017_deal_radar.sql      (nếu bỏ deal-radar)
```

