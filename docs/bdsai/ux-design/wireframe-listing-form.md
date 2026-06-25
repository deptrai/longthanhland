# Wireframe (low-fi) — Multi-Step Listing Form (M3.2 / FR3)

**Mục đích:** Thống nhất số bước, thứ tự field, validation và xử lý lỗi cho form đăng tin trước khi dev. Đây là low-fi (bố cục + hành vi), KHÔNG phải visual design — visual đến từ shadcn/ui.

**Liên quan:** PRD M3.2, AD-2 (mutation qua NestJS), AD-7 (image → Supabase Storage WebP), AD-5/AD-8 (auth), edge case "JWT expire giữa form".

---

## Tổng quan flow: 4 bước + xác nhận

```
[Bước 1]        [Bước 2]         [Bước 3]        [Bước 4]        [Hoàn tất]
Thông tin  →   Vị trí &     →   Hình ảnh    →   Xem lại    →   Đã đăng
cơ bản          chi tiết         (upload)        & đăng          (chờ duyệt)

Progress: ●───○───○───○   (stepper hiển thị bước hiện tại / tổng)
```

**Nguyên tắc UX:**
- Lưu **draft tự động** sau mỗi bước (chống mất data — xử lý edge case JWT expire).
- Nút "Lưu nháp" + "Tiếp tục" ở mỗi bước; "Quay lại" từ bước 2 trở đi.
- Validation **theo từng bước** (không cho qua bước nếu field bắt buộc trống).

---

## Bước 1 — Thông tin cơ bản

```
┌─────────────────────────────────────────────┐
│  Đăng tin mới                    ●───○───○───○ │
├─────────────────────────────────────────────┤
│  Loại BĐS *        [▼ Đất nền / Nhà / Căn hộ]│
│  Hình thức *       ( ) Bán   ( ) Cho thuê     │
│  Tiêu đề *         [____________________]      │
│                    (gợi ý: 20-70 ký tự)        │
│  Mô tả *           [                    ]      │
│                    [   textarea          ]      │
│  Giá *             [________] [▼ VNĐ/Tỷ/Triệu] │
│  Diện tích *       [________] m²               │
├─────────────────────────────────────────────┤
│           [Lưu nháp]      [Tiếp tục →]         │
└─────────────────────────────────────────────┘
```
**Validation:** tất cả field `*` bắt buộc. Giá > 0, diện tích > 0. Tiêu đề ≥ 10 ký tự.

---

## Bước 2 — Vị trí & chi tiết

```
┌─────────────────────────────────────────────┐
│  Đăng tin mới                    ●───●───○───○ │
├─────────────────────────────────────────────┤
│  Tỉnh/Thành *      [▼ Đồng Nai (mặc định)]    │
│  Quận/Huyện *      [▼ Long Thành (mặc định)]  │
│  Phường/Xã *       [▼ ...]                     │
│  Địa chỉ cụ thể    [____________________]      │
│  Hướng             [▼ Đông/Tây/Nam/Bắc...]    │
│  Pháp lý           [▼ Sổ đỏ/Sổ hồng/HĐ...]    │
│  Số phòng ngủ      [__]   Số toilet [__]       │
│  (ẩn nếu loại = Đất nền)                       │
├─────────────────────────────────────────────┤
│      [← Quay lại]  [Lưu nháp]  [Tiếp tục →]   │
└─────────────────────────────────────────────┘
```
**Logic:** Long Thành/Đồng Nai là default (focus thị trường). Field phòng ngủ/toilet ẩn theo loại BĐS.

---

## Bước 3 — Hình ảnh

```
┌─────────────────────────────────────────────┐
│  Đăng tin mới                    ●───●───●───○ │
├─────────────────────────────────────────────┤
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│   │ ✕   │ │ ✕   │ │ ✕   │ │  +  │  kéo-thả   │
│   │ IMG │ │ IMG │ │ IMG │ │ Add │  hoặc click│
│   └─────┘ └─────┘ └─────┘ └─────┘            │
│   ↑ ảnh đầu = ảnh bìa (kéo để sắp xếp)        │
│                                                │
│   • Tối đa 10 ảnh, mỗi ảnh ≤ 10MB (AD-7)      │
│   • Tự động chuyển WebP (server-side)         │
│   • Upload trực tiếp → Supabase Storage (AD-2 │
│     exception: storage upload được phép)       │
│   [▓▓▓▓▓░░░] đang upload 3/4...                │
├─────────────────────────────────────────────┤
│      [← Quay lại]  [Lưu nháp]  [Tiếp tục →]   │
└─────────────────────────────────────────────┘
```
**Validation:** ≥ 1 ảnh bắt buộc. Reject file > 10MB hoặc không phải ảnh (thông báo rõ). Upload async — chặn "Tiếp tục" tới khi upload xong.

---

## Bước 4 — Xem lại & đăng

```
┌─────────────────────────────────────────────┐
│  Đăng tin mới                    ●───●───●───● │
├─────────────────────────────────────────────┤
│  [Preview card tin đăng như buyer sẽ thấy]    │
│  ┌───────────────────────────────────┐       │
│  │ [ảnh bìa]  Tiêu đề...              │       │
│  │            2.5 tỷ · 100m² · LT     │       │
│  └───────────────────────────────────┘       │
│                                                │
│  ☑ Tôi cam kết thông tin chính xác và đồng ý  │
│    với điều khoản đăng tin                      │
├─────────────────────────────────────────────┤
│   [← Quay lại]  [Lưu nháp]  [📤 Đăng tin]     │
└─────────────────────────────────────────────┘
```
**Hành vi đăng:** Submit → POST qua NestJS (AD-2) → status `PENDING` (chờ admin duyệt, FR4) → chuyển sang màn "Hoàn tất".

> ⚠️ **KHÔNG có nút "Quảng bá" ở đây** — promotion (FR12, Xaction) là Track B, BLOCKED. Sẽ thêm sau khi gỡ gate.

---

## Màn hoàn tất

```
┌─────────────────────────────────────────────┐
│            ✓ Đăng tin thành công!             │
│   Tin của bạn đang chờ duyệt (thường < 24h).  │
│   [Xem tin của tôi]   [Đăng tin khác]         │
└─────────────────────────────────────────────┘
```

---

## Xử lý lỗi & edge case (BẮT BUỘC — từ Edge Case Hunter)

| Tình huống | Hành vi |
|---|---|
| **JWT Supabase expire giữa form** | Draft đã auto-save → khi submit gặp 401, refresh token im lặng (AD-5) rồi retry; nếu fail → modal "Phiên hết hạn, đăng nhập lại" + giữ nguyên draft, KHÔNG mất data |
| Mất mạng giữa upload ảnh | Hiển thị ảnh lỗi với nút "Thử lại" từng ảnh; không chặn ảnh đã upload xong |
| User thoát giữa chừng | Draft tự lưu; lần sau vào "Đăng tin" → hỏi "Tiếp tục tin nháp?" |
| Submit trùng (double-click) | Disable nút "Đăng tin" sau click đầu; idempotency key |
| Ảnh > 10MB / sai định dạng | Reject ngay tại client + thông báo rõ lý do |
| Field bắt buộc trống | Chặn "Tiếp tục", highlight field thiếu |

---

**Trạng thái:** low-fi wireframe — đủ cho dev M3.2. Visual chi tiết dùng shadcn/ui khi implement.
**Tạo:** 2026-06-24 · Winston (Architect) theo yêu cầu Luis
