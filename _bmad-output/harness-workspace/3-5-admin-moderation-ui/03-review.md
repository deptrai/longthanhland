# Code Review — Story 3.5 Admin Moderation UI + Token Fix dang-tin

- **Story key:** 3-5-admin-moderation-ui (+ hotfix token dang-tin)
- **Agent:** code-reviewer (opus)
- **Ngày:** 2026-06-27
- **Verdict:** ⛔ **CHANGES REQUESTED**
- **Findings:** 0 critical · 1 high · 1 medium · 6 low

## Phạm vi review

1. Token fix `apps/web/app/(dashboard)/dashboard/dang-tin/page.tsx`
2. Admin moderation UI `/admin/listings` + 5 proxy routes + cập nhật `(admin)/layout.tsx`

Backend NestJS (`marketplace.controller.ts`, `moderation.service.ts`, `admin.guard.ts`) đã tồn tại từ Story 3.3/3.5 trước — verify nhưng KHÔNG nằm trong diff dev lần này (chỉ added `getPublicListing` detail endpoint, ngoài scope).

## Verify đã chạy (adversarial — không tin log dev)

| Lệnh | Kết quả |
|------|---------|
| `git status` / `git diff` | Xác nhận đúng các file scope; backend endpoints đã có sẵn |
| `yarn workspace @bdsai/web typecheck` (`tsc --noEmit`) | ✅ PASS (exit 0, 0 error) |
| `yarn workspace @bdsai/web lint` | ❌ FAIL — 1 error tại `app/listings/page.tsx:95` (xem H1) |
| Đọc body thật: controller, moderation.service, admin.guard, auth-fetch | ✅ Endpoints + AdminGuard + audit log khớp UI |

---

## Findings

### HIGH

**H1 — Lint gate RED, sẽ chặn CI/e2e/deploy**
`apps/web/app/listings/page.tsx:95` — `react-hooks/set-state-in-effect`: gọi `fetchListings()` (có setState) trực tiếp trong `useEffect`.
- File này **untracked, NGOÀI 2 fix được giao** (trang search results, Story 3.3/3.4), nhưng `eslint .` chạy toàn web → **toàn bộ lint gate đỏ**. Pipeline e2e/CI sẽ fail dù 2 fix scope đã lint-clean.
- **Cách sửa:** inline async + cờ `cancelled` trong effect (đúng pattern đã dùng ở `listings-table.tsx` / `users-table.tsx`), không gọi callback setState trực tiếp. Cần xác nhận với leader ai sở hữu file này; phải xanh lint trước khi merge.

### MEDIUM

**M1 — Reject reason: UI báo "tùy chọn" nhưng backend bắt buộc ≥3 ký tự → AC gap + UX vỡ**
`apps/web/app/(admin)/admin/listings/listings-table.tsx:457` placeholder "Lý do từ chối (tùy chọn)", không validate; `handleReject` (L156) đóng dialog ngay (`setRejectTarget(null)`).
Backend `marketplace.service.ts:380-382` `rejectListing` ném `BadRequestException('Lý do từ chối tối thiểu 3 ký tự')` nếu reason rỗng/<3.
- Hệ quả: admin bấm "Từ chối" không nhập lý do → 400, dialog đã đóng, chỉ thấy banner lỗi, phải mở lại. AC 3.5 yêu cầu "reject → REJECTED **kèm lý do gửi seller**" → lý do là bắt buộc.
- **Cách sửa:** đổi placeholder bỏ "(tùy chọn)" (vd "Lý do từ chối (bắt buộc, tối thiểu 3 ký tự)"), `disabled={rejectReason.trim().length < 3}` cho nút "Từ chối", và KHÔNG đóng dialog khi submit lỗi (giữ `rejectTarget` cho tới khi `res.ok`).

### LOW

**L1 — Audit log mất ngữ cảnh spam** — `handleApprove` (L134) gửi `body: {}`, `handleReject` (L165) chỉ gửi `{ reason }`. Backend `approveWithAudit/rejectWithAudit` nhận `spamFlagged` (mặc định false) để ghi audit. Tin đang nghi spam (`item.spamFlagged=true`) khi được duyệt/từ chối vẫn ghi audit `spamFlagged=false` → mất dấu vết "duyệt dù bị cờ spam". Sửa: gửi `{ spamFlagged: item.spamFlagged }` (và kèm reason cho reject).

**L2 — Bulk approve không có confirm dialog** — reject 1 tin có dialog xác nhận, nhưng "Duyệt N tin đã chọn" (L289) chạy ngay khi bấm. Rủi ro mass-approve nhầm. Cân nhắc thêm confirm.

**L3 — Race nút bulk** — `handleBulkApprove` chỉ disable khi `actionLoadingId==='bulk'`; trong lúc đang approve 1 row (`actionLoadingId=row.id`) nút bulk vẫn click được → gọi đồng thời. Sửa: disable bulk khi `actionLoadingId !== null`.

**L4 — Partial failure thiếu chi tiết** — `handleBulkApprove` (L207-211) chỉ hiển thị "Đã duyệt X tin, Y thất bại"; không cho biết tin nào/why (`body.failed[].error` bị bỏ). Tin thất bại vẫn ở lại list nhưng admin không biết lý do. Cân nhắc liệt kê.

**L5 — Tooltip spam chỉ qua native `title`** — `listings-table.tsx:354` dùng `title={item.spamReasons.join(', ')}`, không truy cập được bằng bàn phím/touch. A11y minor; cân nhắc tooltip có aria.

**L6 — Local decrement total không refetch** — sau approve/reject/bulk, list lọc cục bộ + `total` giảm tay (không refetch trang). Trang có thể hiển thị <20 mục và total lệch nếu admin khác thao tác đồng thời. Khớp pattern `users-table.tsx` hiện có → chấp nhận, ghi nhận.

---

## Bảng verify AC (Story 3.5)

| AC | Trạng thái | Ghi chú |
|----|-----------|---------|
| Admin mở hàng đợi moderation trong `(admin)`, thấy PENDING | ✅ | `/admin/listings` + nav "Tin chờ duyệt" (layout L56), proxy `GET /admin/pending` |
| Tin nghi spam gắn cờ | ✅ | Cột "Spam" badge + tooltip `spamReasons`; backend `checkSpam` |
| approve → PUBLISHED | ✅ | `handleApprove` → `POST /listings/:id/approve`, backend `approveListing` PENDING→PUBLISHED |
| reject → REJECTED kèm lý do gửi seller | ⚠️ | Endpoint đúng, NHƯNG reason để optional ở UI (M1) — lý do bắt buộc theo AC |
| bulk approve nhiều tin | ✅ | checkbox + `POST /admin/bulk-approve` |
| lý do reject chọn từ mẫu | ✅ | `GET /admin/reject-reasons` → chips chọn nhanh (L440-452) |
| hành động ghi audit log (UI gọi đúng endpoint) | ✅ | Đúng endpoint; backend `logAudit`. Caveat L1: spamFlagged không forward |
| **Token fix dang-tin** | ✅ | Bỏ hết `localStorage.getItem('accessToken')`; dùng `useAuthFetch` + guard `isLoading`/`!isAuthenticated` (grep xác nhận 0 reference token) |

## Bảng verify Invariant AD

| Invariant | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| AD-10 Web thin proxy, no business logic | ✅ | 5 proxy chỉ forward Authorization + body/query, trả `res.status` passthrough |
| AD-5 Auth Separation / admin guard | ✅ | Backend `AdminGuard` query `public_users.role` (không tin JWT claim); UI guard client chỉ UX. Defense-in-depth |
| AD-8 PII/Secret redact | ✅ | Không hardcode secret; chỉ forward bearer; không log token |
| AD-7 Error shape | ✅ | Proxy trả `{ statusCode, message, error }`; 401/503 đúng |
| AD-4 SSR Boundary | ✅ | page.tsx server wrapper → client island; auth check client-side |
| Type safety (no `any`) | ✅ | Proxy dùng `unknown`; component dùng interface; không `any` trong file scope |
| Naming/exports (kebab-case, named export, default cho page) | ✅ | Khớp pattern `admin/users` |

---

## Kết luận & recommendation

Code 2 fix scope **chất lượng tốt, bám sát pattern `admin/users`**, type-safe, bảo mật đúng (admin guard server-side + thin proxy + token fix sạch). Tuy nhiên:

- **H1** làm **lint gate đỏ** → CI/e2e/deploy sẽ fail (dù lỗi ở file untracked ngoài 2 fix). Phải xử lý trước khi qua e2e.
- **M1** là **AC gap thật** (reject phải kèm lý do) + UX vỡ khi reject rỗng.

→ **CHANGES REQUESTED.** Yêu cầu story-developer: (1) sửa H1 để lint xanh, (2) sửa M1 ép reason bắt buộc + giữ dialog khi lỗi. L1 nên fix luôn (audit log spam context). L2-L6 tùy chọn, không chặn.
