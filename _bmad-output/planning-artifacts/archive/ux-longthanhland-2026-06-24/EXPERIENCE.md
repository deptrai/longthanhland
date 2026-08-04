---
name: bdsai.vn — Experience Spine
status: final
created: 2026-06-24
updated: 2026-06-27
sources:
  - _bmad-output/planning-artifacts/PRD-marketplace-mvp-v2.md
  - _bmad-output/planning-artifacts/architecture/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/epics.md
  - docs/bdsai/ux-design/wireframe-listing-form.md
design_ref: ./DESIGN.md
---

# bdsai.vn — Experience Spine

> Cross-reference token DESIGN.md bằng `{path.to.token}`. Spine thắng mọi mock/wireframe khi xung đột. Phạm vi: Track A surfaces. Track B (promotion/import UI) BỎ — chờ gỡ gate Xaction.

## Foundation

- **Form-factor:** Web responsive mobile-first (360px → 1440px). Public pages SSR (AD-4). Admin/dashboard có thể client-heavy.
- **UI system:** shadcn/ui + Tailwind CSS 4 (chốt từ Architecture). EXPERIENCE.md chỉ ghi **behavioral delta**; visual specs ở `{DESIGN.md}`.
- **Rendering boundary:** `/`, `/listings`, `/listings/[id]`, `/sitemap.xml` MUST server-render (AD-4). Form, map, filter tương tác qua `'use client'` islands.
- **Auth:** public user qua Supabase Auth (JWT); admin qua NestJS guard riêng (AD-5).

## Information Architecture

```
(public)                          (dashboard) — seller, cần auth        (admin) — cần role admin
├── /                  Home       ├── /my-listings    Tin của tôi        ├── /moderation   Duyệt tin
├── /listings          Browse     ├── /my-listings/new  Đăng tin (4 bước) │   └── (tab Appeals)  Khiếu nại điểm
├── /listings/[id]     Detail     ├── /my-listings/[id]/appeal  Khiếu nại  ├── /users        Quản lý user
├── /auth/login                   ├── /inquiries      Inquiry nhận được   └── (Track B: /imports — BỎ)
├── /auth/register                └── (Track B: /promote — BỎ)
└── /about
```

**Surface closure:** mọi nhu cầu PRD Track A có surface; mọi surface có flow dẫn tới. Surface **Appeal** (`/my-listings/[id]/appeal`) hiện thực hóa quyền khiếu nại Trust Score của Section 11.3 PRD — CTA xuất hiện khi điểm dưới ngưỡng; admin xử lý qua tab Appeals trong `/moderation`. Promotion/import surface thuộc Track B — không xuất hiện trong nav cho tới khi gỡ gate.

## Voice and Tone

- **Ngôn ngữ:** Tiếng Việt, thân thiện-chuyên nghiệp, rõ ràng. Tránh thuật ngữ BĐS khó hiểu với người mua phổ thông.
- **Microcopy:** ngắn, hành động rõ. Nút: "Đăng tin", "Quảng bá" (Track B), "Liên hệ người bán", "Lưu nháp".
- **AI insight disclaimer:** luôn kèm "Điểm tham khảo do AI tạo, không phải xác nhận pháp lý" (Section 11.3 PRD).
- **Error:** giải thích nguyên nhân + cách khắc phục, không đổ lỗi. VD "Ảnh quá 10MB — chọn ảnh nhỏ hơn."

## Component Patterns (behavioral)

- **listing-card** (visual `{components.listing-card}`): click → detail; trust-badge overlay góc ảnh; lazy-load ảnh (NFR4). **Ảnh placeholder SVG** khi listing chưa có ảnh — không vỡ layout.
- **trust-badge** (`{components.trust-badge}`): hiển thị **2 sub-state phân biệt rõ** —
  - **"Chưa đủ dữ liệu"** (tin mới/seller mới, màu **neutral** không phải emerald) — KHÔNG hiển thị điểm số, tránh buyer hiểu nhầm "điểm thấp = lừa đảo".
  - **Điểm số thật** "Tin cậy: 72" (nền emerald) — kèm icon shield để self-explanatory trên grid (buyer lần đầu hiểu ngay thang đo).
  - Tooltip (hover + **keyboard focus**) giải thích cách tính bằng ngôn ngữ phổ thông; click → trang giải thích. Listing detail hiện lý do chính của điểm.
  - **Component file:** `components/shared/trust-badge.tsx` — dùng cho cả card overlay + detail inline.
- **ai-insight-card** (`{components.ai-insight-card}`): **header bắt buộc có chip "Phân tích bởi AI · bdsai.vn"** + disclaimer luôn inline (không ẩn được); tách section heading rõ "Mô tả của người bán" vs "Phân tích AI" để buyer không đọc AI summary như lời seller; nếu chưa có kết quả → ẩn gọn (không vỡ layout) với `aria-live` announce khi cập nhật. **Border emerald nhạt + icon AI** phân biệt visual với nội dung seller.
- **multi-step-form**: stepper 4 bước, auto-save draft mỗi bước, validate theo bước. **→ Composition reference:** `docs/bdsai/ux-design/wireframe-listing-form.md` (low-fi wireframe 4 bước + bảng xử lý edge case). Spine thắng khi xung đột với wireframe. Focus management: chuyển bước → focus về heading bước mới; validation fail → focus về first error field.
- **filter-bar** (browse): location/price/type/area; áp filter không reload trang (client island), URL phản ánh filter (shareable + SEO). **Mobile (<md): filter trong Sheet drawer** (button "Bộ lọc tìm kiếm" → bottom sheet 80vh), desktop (md+): inline grid 4 cột.
- **label-vi-etnam** (`lib/labels.ts`): Việt hóa propertyType (land→Đất, house→Nhà, apartment→Căn hộ, commercial→Thương mại) + listingType (sell→Bán, rent→Cho thuê) cho user phổ thông.

## State Patterns

Mọi surface dữ liệu phải định nghĩa 4 trạng thái:
- **Loading:** skeleton (không spinner toàn trang); SSR trả HTML có nội dung, island hydrate sau.
- **Empty:** thông điệp + CTA. VD search rỗng → "Không tìm thấy tin phù hợp. Thử mở rộng khu vực?"
- **Error:** thông báo rõ + nút thử lại; không mất dữ liệu user đã nhập (đặc biệt form).
- **Success/Loaded:** nội dung chính.

Trạng thái đặc thù:
- **Listing lifecycle:** DRAFT / PENDING (chờ duyệt — banner vàng) / PUBLISHED / REJECTED (lý do hiển thị cho seller) / EXPIRED (CTA gia hạn) / SOLD (badge, ẩn khỏi search).
- **Appeal lifecycle (Section 11.3):** seller mở khiếu nại điểm → APPEAL_PENDING (banner "đang xem xét"); admin xử lý → APPEAL_RESOLVED (kèm phản hồi). Hiện trong `/my-listings/[id]/appeal` (seller) + tab Appeals `/moderation` (admin).
- **AI pending:** ai-insight-card hiện "Đang phân tích..." (`aria-live=polite`) rồi cập nhật khi job xong (không block trang).
- **`/inquiries` (seller):** empty ("Chưa có liên hệ nào — chia sẻ tin để nhận lead") / loading skeleton / error (thử lại) / loaded (danh sách + badge "mới").
- **`/my-listings` (seller):** empty ("Chưa có tin — Đăng tin đầu tiên") / loading / error / loaded; mỗi tin hiện lifecycle state + gợi ý tăng Trust Score.
- **`/listings` (browse):** thêm error state khi search API lỗi (không chỉ empty) — "Lỗi tải kết quả, thử lại".

## Interaction Primitives

- **Auto-save draft:** form lưu sau mỗi bước; JWT expire giữa form → refresh im lặng, fail thì modal đăng nhập lại, GIỮ nguyên draft (AD-5, edge case).
- **Optimistic UI:** hạn chế — ưu tiên trạng thái thật cho hành động quan trọng (đăng tin, duyệt). Inquiry gửi có thể optimistic.
- **Idempotency:** disable nút sau click đầu (đăng tin, gửi inquiry) chống double-submit.
- **Upload ảnh:** kéo-thả + click, progress per-ảnh, retry per-ảnh khi lỗi mạng, ảnh đầu = bìa (kéo sắp xếp).

## Accessibility Floor (behavioral)

- Tương phản màu đạt WCAG AA (visual contrast specs ở `{DESIGN.md}`).
- Mọi tương tác thao tác được bằng bàn phím; focus indicator rõ.
- Form: label liên kết input, lỗi đọc được bởi screen reader (aria-describedby).
- Ảnh listing có alt mô tả; icon-only button có aria-label.
- Stepper form thông báo bước hiện tại cho screen reader.
- **Form validation:** `aria-invalid` + `aria-describedby` cho field lỗi; lỗi KHÔNG chỉ dùng màu (kèm icon + text).
- **Focus management:** modal/sheet/filter-drawer có focus trap (dùng Radix mặc định của shadcn, không override `onOpenAutoFocus`); chuyển bước form → focus heading mới.
- **Upload ảnh:** có keyboard alternative cho drag-and-drop (nút chọn file + nút di chuyển thứ tự ảnh) — drag reorder không được là cách duy nhất.
- **Touch target ≥ 44px** trên mobile (trust-badge pill nhỏ phải đủ vùng chạm).
- **Skip navigation link** đầu trang; `<html lang="vi">`.
- Tương phản emerald: xem cảnh báo CRITICAL ở `{DESIGN.md}` Colors — emerald chỉ background/border.
- Lưu ý: full WCAG cần kiểm thử với assistive tech + chuyên gia — đây là sàn behavioral, không phải chứng nhận.

## Responsive & Platform

- **Mobile (360-767px):** 1 cột; filter trong drawer/sheet; nav thu gọn hamburger; form 4 bước full-screen từng bước.
- **Tablet (768-1023px):** 2 cột grid; filter sidebar thu gọn.
- **Desktop (1024-1440px):** 3-4 cột grid; filter sidebar cố định; admin layout dày đặc.
- Public pages tối ưu Core Web Vitals (NFR1/3/4); ảnh WebP responsive sizes (AD-7).

## Key Flows

### Flow 1 — Đăng tin nhanh (anh Minh, môi giới Long Thành, 32t, có 30 lô cần bán, đang ngồi cà phê sáng)

1. Anh Minh đăng nhập, vào `/my-listings/new`.
2. Bước 1-2: nhập thông tin lô đất, vị trí mặc định sẵn "Long Thành, Đồng Nai" → tiết kiệm thao tác.
3. Bước 3: kéo-thả 5 ảnh từ điện thoại; 1 ảnh lỗi mạng → nhấn "Thử lại" riêng ảnh đó, không mất 4 ảnh kia.
4. **[CLIMAX]** Anh có lô thứ 2 tương tự → bấm **"Nhân bản tin"** từ tin vừa tạo, chỉ sửa giá + số lô, đăng tiếp trong 30 giây. Đây là khoảnh khắc anh thấy bdsai.vn *nhanh hơn* đăng tay trên Facebook.
5. Tin chuyển PENDING; anh thấy banner "Đang chờ duyệt < 24h".

**Failure path (Flow 1):** Nếu JWT Supabase hết hạn giữa lúc anh Minh đang ở bước 3 (đã nhập 2 bước + upload ảnh): hệ thống refresh token im lặng, anh không nhận ra gì. Nếu refresh fail → modal "Phiên hết hạn, đăng nhập lại" hiện ra, draft ĐÃ auto-save nên sau khi đăng nhập lại anh quay về đúng bước 3 với dữ liệu nguyên vẹn — KHÔNG mất công nhập (AD-5, edge case Edge Case Hunter). Nếu 1 ảnh upload lỗi mạng → nút "Thử lại" riêng ảnh đó.

### Flow 2 — Tìm tin đáng tin (chị Lan, nhân viên văn phòng TP.HCM, 28t, sợ tin ảo, tìm đất đầu tư, buổi tối)

1. Chị Lan vào `/listings`, lọc "Long Thành" + giá "1-3 tỷ".
2. Grid hiện tin kèm **trust-badge** — chị bỏ qua tin điểm thấp, click tin có badge emerald cao.
3. Trang detail SSR tải nhanh; chị đọc **ai-insight-card**: AI tóm tắt ưu/nhược + đánh giá khu vực.
4. **[CLIMAX]** Chị thấy disclaimer "Điểm tham khảo do AI tạo" — *chị tin tưởng vì nền tảng minh bạch về giới hạn của AI*, không phóng đại. Đây là khoảnh khắc khác biệt với tin Facebook trôi nổi.
5. Chị bấm "Liên hệ người bán", điền form, gửi. Nhận xác nhận đã gửi.

### Flow 3 — Duyệt tin hiệu quả (Admin, sáng thứ Hai, 40 tin PENDING qua cuối tuần)

1. Admin vào `/moderation`, thấy 40 tin PENDING, 6 tin gắn cờ spam (đỏ).
2. Admin xem nhanh tin sạch, **chọn nhiều tin** một lúc.
3. **[CLIMAX]** Bấm **"Bulk approve"** 30 tin sạch cùng lúc → xử lý 1 phút thay vì 30 lần click. Tin cờ spam để lại xem kỹ.
4. 6 tin spam: admin xem, reject với **lý do mẫu** chọn từ dropdown, seller nhận thông báo lý do.

## Inspiration & Anti-patterns

- **Inspiration:** Zillow/Batdongsan (độ tin cậy, listing card rõ); Linear/Vercel (đơn sắc tech-forward, typography mạnh).
- **Anti-pattern:** tránh tin trôi nổi không kiểm chứng kiểu Facebook group; tránh UI lòe loẹt nhiều màu kiểu một số sàn rao vặt cũ; tránh AI insight giả danh nội dung người thật (phải phân biệt — minh bạch).
