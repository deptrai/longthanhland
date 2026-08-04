---
name: bdsai.vn — CRM Workspace Experience Spine
status: draft
created: 2026-08-04
updated: 2026-08-04
design_ref: ./DESIGN.md
---

# bdsai.vn — CRM Workspace Experience Spine

## Foundation

- **Form-factor:** Web responsive mobile-first + browser extension side panel (400px fixed).
- **Rendering:** Dashboard pages có thể client-heavy. Deal-Radar và Lead dùng `'use client'` islands.
- **Auth:** JWT từ Supabase Auth.

## User Journeys

### UJ-1: Môi giới tạo Deal-Radar filter
1. Vào `/dashboard/deal-radar`
2. Nhập mô tả bằng lời vào textarea
3. Bấm "Phân tích filter"
4. Hệ thống parse thành fields
5. User chỉnh sửa nếu cần
6. Bấm "Lưu filter"
7. Xem kết quả khớp hiện có

### UJ-2: Môi giới nhận alert
1. Tin mới khớp filter được publish/import
2. Alert xuất hiện trong `/dashboard/deal-radar`
3. Đồng thời gửi tin nhắn vào group Zalo riêng
4. Môi giới mở alert, xem link nguồn
5. Bấm "Lưu vào lead" hoặc "Đánh dấu đã đọc"

### UJ-3: Môi giới quản lý lead
1. Vào `/dashboard/leads`
2. Xem bảng lead
3. Bấm lead để mở detail drawer
4. Cập nhật trạng thái, thêm notes, gán tin
5. Đóng drawer

### UJ-4: Môi giới dùng AI viết tin
1. Tạo listing, đến bước 2 "Mô tả"
2. Bấm "Viết lại bằng AI"
3. Xem kết quả
4. Bấm "Dùng bản này" hoặc chỉnh sửa tay

### UJ-5: Môi giới dùng browser extension
1. Mở tab Batdongsan/Chợ Tốt
2. Bấm icon extension
3. Side panel mở, trích thông tin
4. Chọn "Lưu vào Deal-Radar source" hoặc "Tin đăng draft"
5. Bấm "Lưu"

## State Patterns

### Deal-Radar
- **Empty:** "Chưa có filter — tạo filter đầu tiên"
- **Loading:** skeleton cards
- **Error:** "Không thể phân tích filter — thử lại"
- **Loaded:** filter list + alert list

### Lead
- **Empty:** "Chưa có lead — thêm lead đầu tiên"
- **Loading:** skeleton table
- **Error:** "Lỗi tải leads — thử lại"
- **Loaded:** table + detail drawer

### AI viết tin
- **Idle:** nút "Viết lại bằng AI"
- **Loading:** "Đang viết..."
- **Success:** textarea kết quả + actions
- **Error:** "AI không khả dụng — thử lại"

### Browser extension
- **Unauthenticated:** form login
- **Loading:** "Đang trích thông tin..."
- **Loaded:** listing preview + save options
- **Success:** "Đã lưu"
- **Error:** thông báo lỗi

## Interaction Primitives

- **Filter save:** validate parsed fields, không cho lưu nếu parse sai hoàn toàn.
- **Alert real-time:** polling 30s hoặc SSE (deferred).
- **Lead status change:** log audit, cập nhật `updatedAt`.
- **AI rewrite:** idempotent — gọi lại được, cache theo content hash.
- **Extension save:** gửi dữ liệu qua `chrome.runtime.sendMessage` → background → bdsai API.
