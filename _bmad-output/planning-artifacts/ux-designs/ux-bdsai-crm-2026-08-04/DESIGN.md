---
name: bdsai.vn — CRM Workspace UX Design
status: draft
created: 2026-08-04
updated: 2026-08-04
sources:
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/ux-designs/ux-longthanhland-2026-06-24/DESIGN.md
---

# bdsai.vn — CRM Workspace UX Design

## Scope

Thiết kế UX cho 4 surface mới trong Seller CRM Workspace:
1. Deal-Radar page (`/dashboard/deal-radar`)
2. Lead management page (`/dashboard/leads`)
3. AI viết tin flow (trong `/dashboard/listings/new`)
4. Browser extension side panel

## Design Tokens (kế thừa)

Kế thừa từ `DESIGN.md` gốc:
- Primary: `#111827` (slate near-black)
- Accent: `#10B981` (emerald) — chỉ cho tín hiệu tin cậy
- Typography: Geist
- Rounded: sm 4px, md 8px, lg 12px

## Information Architecture — Dashboard Sidebar

```
/dashboard
├── /                  Tổng quan
├── /listings          Tin đăng (đổi từ /my-listings)
├── /listings/new      Đăng tin
├── /deal-radar        Deal-Radar
├── /leads             Lead quản lý
├── /inquiries         Liên hệ đến
├── /ai-tools          AI viết tin
├── /news              Tin tức
└── /settings          Cài đặt
```

## Deal-Radar Page

### Layout
- Header: tiêu đề "Deal-Radar" + nút "Tạo filter" + badge số alert chưa đọc
- Left column (desktop 1/3): danh sách filter đã lưu
- Right column (desktop 2/3): kết quả/alert cho filter đang chọn

### Components
1. **Filter input bằng lời**
   - Textarea placeholder: "Ví dụ: Căn hộ Bình Thạnh 3-4 tỷ, 60-80m2, 2 phòng ngủ"
   - Nút "Phân tích filter" → hiển thị parsed fields (propertyType, location, priceRange, areaRange)
   - User có thể edit parsed fields trước khi lưu

2. **Filter card**
   - Tiêu đề filter
   - Parsed fields
   - Badge "có X tin khớp mới"
   - Nút edit/delete

3. **Alert card**
   - Tiêu đề tin, giá, diện tích, khu vực
   - Badge nguồn (first-party / aggregated)
   - Link nguồn mở tab mới
   - Nút "Đánh dấu đã đọc" / "Lưu vào lead"
   - Timestamp

4. **Empty state**
   - "Chưa có filter nào. Tạo filter đầu tiên để nhận alert."

## Lead Management Page

### Layout
- Header: tiêu đề "Lead" + nút "Thêm lead"
- Table: Tên | Nhu cầu | Ngân sách | Trạng thái | Tin đã gán | Hành động

### Components
1. **Lead row**
   - Tên + phone (ẩn 3 số cuối nếu chưa verify)
   - Nhu cầu tóm tắt 1 dòng
   - Badge trạng thái: Mới (blue) / Đang tưu vấn (amber) / Deal (emerald) / Lost (gray)
   - Link tin đã gán (nếu có)

2. **Lead detail drawer**
   - Thông tin chi tiết
   - Notes textarea
   - Dropdown chọn trạng thái
   - Dropdown chọn tin để gán
   - Lịch sử thay đổi

3. **Add lead form**
   - Tên (bắt buộc)
   - Số điện thoại (tùy chọn)
   - Email (tùy chọn)
   - Nhu cầu (textarea)
   - Ngân sách (number)
   - Khu vực (text)
   - Loại BĐS (select)

## AI Viết Tin Flow

### Placement
- Trong form đăng tin `/dashboard/listings/new`, bước 2 "Mô tả"

### Components
1. **Basic info summary**
   - Hiển thị tiêu đề, giá, diện tích, khu vực, loại BĐS đã nhập ở bước 1

2. **AI rewrite button**
   - Nút "Viết lại bằng AI" (primary)
   - Loading state: "Đang viết..."

3. **Result area**
   - Textarea chứa mô tả AI
   - Nút "Dùng bản này" → điền vào form chính
   - Nút "Viết lại" → gọi AI lại
   - Nút "Hủy" → giữ nguyên mô tả user

4. **Disclaimer chip**
   - "Mô tả do AI tạo, vui lòng kiểm tra trước khi đăng"

## Browser Extension Side Panel

### Layout
- Width: 400px
- Header: logo bdsai + tên user + nút đóng
- Body: thông tin tin đã trích
- Footer: nút "Lưu vào bdsai" + trạng thái

### Components
1. **Unauthenticated state**
   - "Đăng nhập để lưu tin"
   - Input token/JWT + nút login

2. **Authenticated state — listing preview**
   - Tiêu đề
   - Giá
   - Diện tích
   - Khu vực
   - Loại BĐS
   - Nguồn link (badge)
   - Thumbnail nếu có

3. **Save options**
   - Radio: "Lưu vào Tin đăng (draft)" / "Lưu vào Deal-Radar source"
   - Nút "Lưu"

4. **Success/error state**
   - Success: "Đã lưu — xem trong dashboard"
   - Error: thông báo lỗi cụ thể

## Accessibility

- Touch target ≥ 44px
- Focus trap trong drawer
- Form labels liên kết input
- Color contrast đạt WCAG AA (trừ emerald accent chỉ dùng background/border)
