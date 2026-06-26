# bdsai.vn — Browser Test Plan (Toàn bộ tính năng + Roles)

**Mục tiêu:** Verify toàn bộ tính năng MVP (Track A: Epic 1, 2, 3, 4-Phase1, 6) trên browser thật, covering 5 roles: Guest, Buyer, Seller, Admin, Super-Admin.

**Tool:** Playwright MCP (browser thật, không mock).
**Base URL:** `http://localhost:3000` (web) + `http://localhost:3101` (api).
**Pre-conditions:** DB đã migrate 0001-0012, seed 50 listings, Redis chạy, BullMQ queue active.

---

## Roles & Test Accounts

| Role | Email | Mục đích |
|------|-------|----------|
| Guest | (chưa login) | Test public pages, inquiry guest |
| Buyer | buyer@test.vn | Test search, inquiry, profile |
| Seller | seller@test.vn | Test đăng tin, dashboard, inquiry nhận |
| Admin | admin@test.vn | Test duyệt tin, ban user, spam config |
| Super-admin | super@test.vn | Test grant role, all admin actions |

---

## Phase A: Guest (chưa đăng nhập)

### A1. Home page `/`
- [ ] Page render < 500ms, có header (logo bdsai.vn, nav, nút "Đăng nhập" + "Đăng tin")
- [ ] Footer hiển thị
- [ ] Responsive 360px + 1440px không vỡ
- [ ] Lighthouse SEO ≥ 90

### A2. Browse listings `/listings`
- [ ] Danh sách PUBLISHED listings hiển thị (không có DRAFT/PENDING/REJECTED/EXPIRED/SOLD)
- [ ] Phân trang hoạt động (next/prev)
- [ ] Sort: mới nhất, giá tăng, giá giảm
- [ ] Filter: province, district, propertyType, listingType
- [ ] Filter price range (min/max) + area range (min/max)
- [ ] Search tiếng Việt: gõ "long thanh" → ra tin "Long Thành"
- [ ] Search không dấu: gõ "can ho" → ra "căn hộ"
- [ ] Empty state khi không có kết quả
- [ ] Click listing → chuyển `/listings/[id]`

### A3. Listing detail `/listings/[id]`
- [ ] SSR render (view-source có nội dung, không blank)
- [ ] Meta tags động (title, description, og:image)
- [ ] Hiển thị: title, price, area, location, images, description, seller info
- [ ] Image gallery + cover image (WebP, lazy load)
- [ ] JSON-LD `RealEstateListing` trong HTML (validate Google Rich Results)
- [ ] AI Summary block hiển thị (nếu có) + disclaimer "Điểm tham khảo do AI tạo"
- [ ] Trust Score hiển thị (nếu có)
- [ ] Inquiry form hiển thị (guest gửi được)
- [ ] Tin non-PUBLISHED → 404

### A4. Inquiry form (guest)
- [ ] Form: tên, phone/email, lời nhắn
- [ ] Validation field bắt buộc
- [ ] Submit thành công → toast "Đã gửi liên hệ"
- [ ] Submit tới tin EXPIRED/SOLD → chặn, báo lỗi
- [ ] Rate limit theo IP (spam thử 5 lần liên tiếp)

### A5. SEO endpoints
- [ ] `/sitemap.xml` render XML, có listings PUBLISHED + static pages
- [ ] `/sitemap.xml` KHÔNG chứa DRAFT/PENDING/REJECTED
- [ ] `/robots.txt` cho phép index public, chặn /dashboard, /admin
- [ ] Sitemap phân trang khi >500 listings

### A6. Auth pages (guest)
- [ ] `/login` form hiển thị
- [ ] `/register` form hiển thị (email + phone + password)
- [ ] Register trùng email → báo lỗi
- [ ] Register phone sai format → báo lỗi
- [ ] Register password < 8 ký tự → báo lỗi

---

## Phase B: Buyer (đã đăng nhập, role=user)

### B1. Register + Login
- [ ] Register email + phone + password → tài khoản tạo, email xác thực gửi
- [ ] Login email + password đúng → JWT, redirect về home
- [ ] Login sai password → báo lỗi, không tiết lộ email tồn tại
- [ ] Logout → xóa session, redirect home

### B2. Profile `/profile`
- [ ] Cập nhật bio → lưu
- [ ] Upload avatar (≤10MB, auto WebP)
- [ ] Avatar > 10MB → reject
- [ ] Bio quá dài → reject
- [ ] Bio chứa `<script>` → sanitize

### B3. Phone OTP verify
- [ ] Click "Xác thực số điện thoại" → gửi OTP
- [ ] Nhập OTP đúng → phone_verified = true, badge hiển thị
- [ ] Nhập OTP sai → báo lỗi
- [ ] Rate limit: 3 OTP/giờ, 10 verify/15min

### B4. Browse + Inquiry (đã login)
- [ ] Tất cả A2, A3, A4 hoạt động
- [ ] Inquiry form pre-fill tên + contact từ profile
- [ ] Inquiry gửi thành công → lưu DB

### B5. Listing detail AI insights
- [ ] AI Summary hiển thị (nếu listing đã approve)
- [ ] Trust Score hiển thị + tooltip "đang đánh giá" nếu score < 20
- [ ] Disclaimer hiển thị
- [ ] Nút "Khiếu nại điểm AI" KHÔNG hiển thị cho buyer (chỉ seller owner)

---

## Phase C: Seller (đã đăng nhập, role=user, có listings)

### C1. Đăng tin — form nhiều bước `/dashboard/dang-tin`
- [ ] Step 1 (Thông tin): title, price, area, propertyType, listingType, description
- [ ] Validation field bắt buộc trước khi qua step 2
- [ ] Step 2 (Vị trí): province, district, ward, street, address, lat/lng
- [ ] Step 3 (Hình ảnh): upload ≤10 ảnh, mỗi ảnh ≤10MB, auto WebP
- [ ] Upload file giả dạng ảnh (magic bytes check) → reject
- [ ] Ảnh đầu = ảnh bìa
- [ ] Step 4 (Xem lại): review tất cả field
- [ ] Draft auto-save sau mỗi step
- [ ] Thoát rồi vào lại → hỏi "Tiếp tục tin nháp?"
- [ ] Submit → listing chuyển PENDING
- [ ] Double-click submit → không tạo trùng (idempotency)

### C2. JWT expire giữa form
- [ ] Để JWT hết hạn giữa step 3 → refresh im lặng, draft giữ nguyên
- [ ] Refresh fail → modal đăng nhập lại, KHÔNG mất data

### C3. Quản lý tin `/dashboard/my-listings`
- [ ] Danh sách tin của seller (tất cả status)
- [ ] Status badge: DRAFT, PENDING, PUBLISHED, REJECTED, EXPIRED, SOLD
- [ ] Nút "Sửa" → `/dashboard/dang-tin?edit=[id]`
- [ ] Edit PUBLISHED tin → chặn (chỉ DRAFT/PENDING/REJECTED sửa được)
- [ ] Edit EXPIRED tin → chặn
- [ ] Nút "Gia hạn" hiển thị khi EXPIRED → click → renew → PUBLISHED
- [ ] Nút "Đánh dấu đã bán" hiển thị khi PUBLISHED → click → SOLD
- [ ] Renew tin SOLD → chặn

### C4. Duplicate listing
- [ ] Click "Nhân bản" → tạo DRAFT mới với title "(bản sao)"
- [ ] Submit tin nhân bản mà không sửa title → chặn, báo "sửa tiêu đề trước"
- [ ] Sửa title rồi submit → OK

### C5. Race condition expire-vs-edit
- [ ] Mở edit tin PENDING (tab 1)
- [ ] Tab 2: admin approve → PUBLISHED + set expiry
- [ ] Tab 1: submit edit → báo "trạng thái đã thay đổi, tải lại trang"
- [ ] KHÔNG ghi đè status

### C6. Inquiry nhận (seller dashboard)
- [ ] `/dashboard/inquiries` hiển thị danh sách inquiry tới tin seller
- [ ] Badge "inquiry mới" trên header
- [ ] Click inquiry → xem chi tiết (tên buyer, phone, lời nhắn, link tin)
- [ ] Email gửi tới seller khi có inquiry (check inbox test)

### C7. Appeal trust score
- [ ] Vào listing detail của own listing
- [ ] Nút "Khiếu nại điểm AI" hiển thị (chỉ seller owner)
- [ ] Click → form reason (≥10 ký tự)
- [ ] Submit → "Đã gửi khiếu nại"
- [ ] Reason < 10 ký tự → chặn

### C8. Banned seller
- [ ] Admin ban seller → seller logout + login lại
- [ ] Seller cố đăng tin → 403 Forbidden
- [ ] Tin đang PUBLISHED của banned seller → ẩn khỏi search

---

## Phase D: Admin (role=admin)

### D1. Admin login + guard
- [ ] Login admin@test.vn → redirect `/admin`
- [ ] User thường cố vào `/admin` → 403
- [ ] User chưa login cố vào `/admin` → redirect login

### D2. User management `/admin/users`
- [ ] Danh sách user (phân trang, search email/phone)
- [ ] Ban user → user.banned = true, audit log ghi
- [ ] Unban user → user.banned = false, audit log ghi
- [ ] User banned không login/đăng tin được
- [ ] Rate limit 20 admin actions/15min

### D3. Moderation queue `/admin/listings`
- [ ] Danh sách tin PENDING
- [ ] Tin nghi spam gắn cờ (keyword blacklist + heuristic)
- [ ] Approve → tin PUBLISHED + set expiry + enqueue AI summary + compute trust score
- [ ] Reject → tin REJECTED + lý do + email seller
- [ ] Bulk approve nhiều tin
- [ ] Reject reason từ mẫu (template)
- [ ] Audit log ghi mỗi action

### D4. Spam config `/admin/spam`
- [ ] List keywords blacklist
- [ ] Add keyword mới
- [ ] Remove keyword
- [ ] Update threshold (min_price, repeat_threshold, etc.)
- [ ] Override spam flag cho false positive

### D5. Admin view non-PUBLISHED
- [ ] Admin xem được tin DRAFT/PENDING/REJECTED (buyer không xem được)
- [ ] GET /marketplace/listings/[id] với admin token → trả tin bất kể status

### D6. Appeals review `/admin/appeals` (qua API)
- [ ] GET /ai/appeals → danh sách appeals
- [ ] Filter status=pending
- [ ] Resolve appeal (reviewed/resolved) + admin_note
- [ ] Seller nhận email kết quả

---

## Phase E: Super-Admin (role=super-admin)

### E1. Super-admin guard
- [ ] Login super@test.vn → có quyền admin + super-admin
- [ ] Admin thường cố gọi POST /admin/users/[id]/role → 403
- [ ] Super-admin gọi POST /admin/users/[id]/role → OK

### E2. Grant/revoke role
- [ ] Grant role=admin cho user thường → user.role = 'admin'
- [ ] Revoke role=admin → user.role = 'user'
- [ ] KHÔNG grant được role=super-admin qua API (chỉ seed SQL)
- [ ] Role invalid (vd 'moderator') → 400
- [ ] Audit log ghi mỗi grant/revoke

### E3. Thu quyền có hiệu lực ngay
- [ ] User A đang admin, đang có session
- [ ] Super-admin revoke admin của A
- [ ] A request tiếp theo → 403 (phiên cũ mất quyền)

---

## Phase F: Cross-cutting (tất cả roles)

### F1. Performance
- [ ] SSR render < 500ms P95 (home, listings, detail)
- [ ] API response < 200ms P95 (search)
- [ ] Page load < 2s P75
- [ ] Lighthouse SEO ≥ 90 (3 routes: /, /listings, /listings/[id])
- [ ] Image WebP + responsive sizes

### F2. Security
- [ ] JWT expire → refresh im lặng
- [ ] Refresh fail → redirect login
- [ ] Rate limit: 3 OTP/giờ, 10 verify/15min, 20 admin/15min
- [ ] XSS: bio/description chứa `<script>` → sanitize
- [ ] SQL injection: search query chứa `'` → không lỗi
- [ ] File upload magic bytes check
- [ ] PII không lộ trong log (phone hash)

### F3. SEO
- [ ] Sitemap động, phân trang
- [ ] robots.txt chặn /dashboard, /admin
- [ ] JSON-LD validate Google Rich Results
- [ ] Meta tags động mỗi listing
- [ ] SSR render (view-source có nội dung)

### F4. Notification email
- [ ] Inquiry mới → email seller (Resend/log)
- [ ] Listing approved → email seller
- [ ] Listing rejected → email seller + lý do
- [ ] Appeal resolved → email seller + admin_note

### F5. Cron job
- [ ] Cron hourly → tin hết hạn chuyển EXPIRED
- [ ] Tin EXPIRED ẩn khỏi search
- [ ] Seller nhận thông báo gia hạn

---

## Test Execution Order

1. **Phase A (Guest)** — verify public pages hoạt động
2. **Phase B (Buyer)** — register + login + browse + inquiry
3. **Phase C (Seller)** — đăng tin + dashboard + inquiry nhận + appeal
4. **Phase D (Admin)** — duyệt tin + ban user + spam config + appeals
5. **Phase E (Super-admin)** — grant role + verify guard
6. **Phase F (Cross-cutting)** — performance + security + SEO + email + cron

Mỗi phase độc lập, có thể chạy song song nếu setup data riêng.

---

## Edge Cases (Priority)

| # | Case | Expected |
|---|------|----------|
| 1 | Inquiry tới tin EXPIRED | Chặn, báo lỗi |
| 2 | Renew tin SOLD | Chặn |
| 3 | Edit tin PUBLISHED | Chặn (chỉ DRAFT/PENDING/REJECTED) |
| 4 | Race expire-vs-edit | Báo "trạng thái đã thay đổi" |
| 5 | Double-click submit | Không tạo trùng |
| 6 | JWT expire giữa form | Draft giữ nguyên, refresh im lặng |
| 7 | File giả dạng ảnh | Reject (magic bytes) |
| 8 | Bio chứa `<script>` | Sanitize |
| 9 | Search SQL injection | Không lỗi |
| 10 | Banned seller đăng tin | 403 |
| 11 | User thường vào /admin | 403 |
| 12 | Admin grant role (không phải super) | 403 |
| 13 | Submit tin nhân bản không sửa title | Chặn |
| 14 | OTP sai 10 lần | Rate limit |
| 15 | Sitemap chứa DRAFT | KHÔNG (chỉ PUBLISHED) |

---

## Pass Criteria

- Tất cả test cases PASS
- 0 critical bugs
- Lighthouse SEO ≥ 90 trên 3 routes
- Performance: SSR < 500ms P95, API < 200ms P95, page load < 2s P75
- Email gửi thành công (Resend hoặc log fallback)
- Cron job chạy đúng hourly
- Audit log ghi đầy đủ (ban/unban/grant/approve/reject)
