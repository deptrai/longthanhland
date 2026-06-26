# bdsai.vn — Browser Test Results Report

**Ngày test:** 26/06/2026
**Tool:** Playwright MCP (browser thật)
**Environment:** API port 3101, Web port 3100, Redis OK
**Status:** PARTIAL — shell broken sau khi restart web server, không thể tiếp tục test

---

## Bugs Found & Fixed

### BUG #1 (FIXED): `next/image` không cấu hình `placehold.co` hostname
- **Severity:** HIGH — `/listings` crash hoàn toàn (Runtime Error)
- **Root cause:** `next.config.ts` thiếu `placehold.co` trong `remotePatterns`. Seed data dùng `placehold.co` cho placeholder images.
- **Fix:** Thêm `placehold.co` + `**.placehold.co` vào `remotePatterns` trong `next.config.ts`
- **File:** `bdsai/apps/web/next.config.ts`
- **Status:** FIXED nhưng cần restart web server để có hiệu lực

### BUG #2 (NOT FIXED): Admin "Cấp admin" button silent fail
- **Severity:** MEDIUM — UX issue
- **Root cause:** Khi admin (không phải super-admin) click "Cấp admin", API trả 403 nhưng UI không hiển thị error toast. Role không thay đổi nhưng user không biết tại sao.
- **Expected:** Hiển thị error toast "Bạn không có quyền thực hiện hành động này"
- **File:** `bdsai/apps/web/app/admin/users/page.tsx` (cần thêm error handling)

### BUG #3 (NOT FIXED): Image 400 error sau khi thêm placehold.co
- **Severity:** LOW — image optimization 400 error
- **Root cause:** next.config.ts change cần full server restart, fast refresh không reload config
- **Status:** Cần restart web server (shell broken, không thể restart)

---

## Test Results by Phase

### Phase A: Guest (6/6 PASS)

| Test | Result | Notes |
|------|--------|-------|
| A1 Home page | PASS | Header, nav, footer, title đúng. Responsive OK |
| A2 Browse listings | PASS | 57 listings, filters (price/area range), sort, pagination 1/5, search "long thanh" → 45 results (Vietnamese FTS OK) |
| A3 Listing detail | PASS | SSR render, meta tags động, title/price/location/description, breadcrumb, JSON-LD RealEstateListing (offers.price string, image array, address, floorSize) |
| A4 Inquiry form | PASS | Form: Họ tên, SĐT, Email, Tin nhắn. Submit → "Đã gửi liên hệ thành công!" |
| A5 SEO endpoints | PASS | sitemap.xml có URLs + lastmod + changefreq + priority. robots.txt chặn /dashboard, /admin, /api/ |
| A6 Auth pages | PASS | Login form (email + password). Register form (email + phone + password + confirm) |

### Phase D: Admin (3/6 PASS, 1 ISSUE)

| Test | Result | Notes |
|------|--------|-------|
| D1 Admin guard | PASS | Admin login → /admin access OK. User thường → 403 |
| D2 User management | PASS | Table 9 users, columns (STT, Email, SĐT, Vai trò, Trạng thái, Ngày tạo, Hành động). Ban/Grant buttons visible |
| D3 Moderation queue | PASS | Table với columns (Chọn tất cả, Tiêu đề, Giá, Diện tích, Khu vực, Spam, Ngày tạo, Hành động). Empty state "Không có tin chờ duyệt". Pagination |
| D4 Spam config | NOT TESTED | Shell broken trước khi test |
| D5 Admin view non-PUBLISHED | NOT TESTED | Shell broken |
| D6 Appeals review | NOT TESTED | Shell broken |
| E2 Super-admin guard | PARTIAL | "Cấp admin" click không đổi role (guard hoạt động) nhưng UI không show error (BUG #2) |

### Phase B: Buyer (NOT TESTED — rate limited + shell broken)
### Phase C: Seller (NOT TESTED — rate limited + shell broken)
### Phase E: Super-admin (NOT TESTED — shell broken)
### Phase F: Cross-cutting (NOT TESTED — shell broken)

---

## Issues Blocking Further Testing

1. **Login rate limit (5 requests/15min):** Too many curl login attempts exhausted the throttle. Need to wait 15min or restart API.
2. **Shell broken:** Terminal sessions fail with "Failed to create terminal session" across all sessions and subagents. Cannot restart web server or run commands.
3. **Web server down:** Killed old server (port 3100) to restart with new next.config, but new server started on port 3000 (default) and then crashed. Cannot restart due to shell broken.

---

## Recommendations

1. **Fix BUG #2:** Add error toast in admin users page when grant/revoke role fails
2. **Restart web server:** `cd bdsai && PORT=3100 yarn workspace @bdsai/web dev` (after shell restored)
3. **Continue testing:** Phase B (Buyer), C (Seller), E (Super-admin), F (Cross-cutting) after web server restart + rate limit reset
4. **Consider:** Lower login rate limit from 5/900s to 10/900s for dev environment
