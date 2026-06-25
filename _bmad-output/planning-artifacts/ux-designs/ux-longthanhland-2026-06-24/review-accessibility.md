# Accessibility Review — bdsai.vn UX Spine
**Reviewer:** Accessibility Specialist  
**Date:** 2026-06-24  
**Scope:** DESIGN.md + EXPERIENCE.md (Track A surfaces)  
**Standard:** WCAG 2.1 Level AA  
**Audience:** Consumer marketplace, bao gồm người lớn tuổi và người dùng mobile phổ thông

---

## Verdict Tổng Thể: **THIN**

Spine đặt đúng ý định ("WCAG AA floor", form label, stepper announce, alt text) nhưng thiếu spec cụ thể đủ để implementation team không phạm lỗi. Có 1 lỗi **CRITICAL** về contrast màu đã xác nhận bằng tính toán, và nhiều gap **HIGH** về keyboard/screen-reader mà spine không đặc tả. Với đối tượng người dùng phổ thông — nhiều người lớn tuổi, dùng mobile — những gap này sẽ tạo rào cản thực sự.

---

## Contrast Ratio — Kết Quả Đo Lường

| Cặp màu | Ratio | AA normal (4.5:1) | AA large/UI (3:1) |
|---------|-------|:-----------------:|:-----------------:|
| `#10B981` Emerald text trên `#FFFFFF` trắng | **2.54:1** | FAIL | FAIL |
| `#04231A` text trên `#10B981` Emerald (badge/card) | 6.57:1 | PASS | PASS |
| `#111827` Slate trên `#FFFFFF` | 17.74:1 | PASS | PASS |
| `#34D399` Emerald trên `#111827` (dark mode) | 9.23:1 | PASS | PASS |
| `#04231A` text trên `#34D399` (dark mode badge) | 8.67:1 | PASS | PASS |

---

## Findings Theo Severity

---

### CRITICAL

#### C-1 — Emerald `#10B981` không thể dùng làm màu text trên nền trắng
**Location:** DESIGN.md > Colors; bất kỳ surface nào dùng emerald làm foreground text  
**Chi tiết:** Contrast ratio 2.54:1 — thấp hơn ngưỡng AA gần gấp đôi (4.5:1 normal text, 3:1 large text/UI). Nếu dev dùng `accent` (#10B981) cho text link, icon label, hoặc bất kỳ chữ nào trên nền trắng, tất cả đều fail WCAG AA. Spine không cảnh báo điều này.  
**Ảnh hưởng:** Người thị lực kém (rất phổ biến với người dùng lớn tuổi) không đọc được nội dung. Text link emerald trên trắng là lỗi phổ biến nhất khi dev implement "dùng accent color cho emphasis".  
**Fix bắt buộc:**
- Thêm quy tắc rõ trong DESIGN.md: "Emerald `#10B981` KHÔNG ĐƯỢC dùng làm màu text trực tiếp trên nền trắng hoặc sáng. Chỉ dùng làm background của badge/border, với text `#04231A` bên trong."
- Nếu cần emerald text trên trắng (VD: link), phải darkened xuống ≥ `#0A6B50` (đạt ~4.6:1) hoặc dùng `#111827` thay thế.
- ai-insight-card border emerald (không phải text) — không ảnh hưởng contrast text, OK.

---

### HIGH

#### H-1 — Multi-step form: thiếu spec keyboard navigation và focus management
**Location:** EXPERIENCE.md > Component Patterns > multi-step-form; Key Flows > Flow 1  
**Chi tiết:** Spine chỉ ghi "stepper form thông báo bước hiện tại cho screen reader" (Accessibility Floor) nhưng không spec:
- Khi bấm "Tiếp theo" chuyển bước, focus phải chuyển về đầu step mới (heading hoặc first input) — không spec
- Khi validate lỗi và không cho qua bước, focus phải nhảy về first error field — không spec
- Progress stepper (1/2/3/4) có keyboard accessible không? Dùng `role="tablist"` + `aria-current="step"` hay chỉ visual?  

**Ảnh hưởng:** User bàn phím / screen reader sẽ bị lạc — sau khi click "Tiếp theo", focus ở đâu? Rất phổ biến trên mobile với switch access hoặc người dùng không chuột.  
**Fix:** Thêm vào Accessibility Floor: "Chuyển bước: focus tự động về `h2` heading của step mới. Validation fail: focus về first `[aria-invalid='true']` field. Stepper indicator dùng `aria-current='step'` cho bước active."

#### H-2 — Filter bar và filter drawer: focus trap thiếu spec
**Location:** EXPERIENCE.md > Responsive & Platform > Mobile; Component Patterns > filter-bar  
**Chi tiết:** Trên mobile, filter trong drawer/sheet. Spine không spec:
- Khi drawer mở, focus trap bên trong drawer (Tab không thoát ra ngoài) — bắt buộc theo WCAG 2.1 SC 2.1.2
- Khi đóng drawer, focus trả về trigger button mở drawer
- Drawer có `role="dialog"` + `aria-modal="true"` + `aria-labelledby` không?

**Ảnh hưởng:** Người dùng bàn phím sẽ Tab ra ngoài drawer vào nội dung ẩn phía sau — trải nghiệm confusing và broken.  
**Fix:** Thêm spec: "Filter drawer (Sheet component của shadcn) phải có focus trap khi mở. Close trigger trả focus về button gọi drawer. shadcn Sheet mặc định có focus trap — đừng override."

#### H-3 — Trust score tooltip: chỉ hover, không có keyboard trigger
**Location:** EXPERIENCE.md > Component Patterns > trust-badge  
**Chi tiết:** Spine ghi "click → giải thích cách tính" cho trust-badge. Tooltip giải thích là thông tin quan trọng (người dùng cần hiểu Trust Score là gì). Nếu tooltip chỉ trigger bằng hover/click chuột mà không bằng `focus` + `Enter`/`Space`, người dùng bàn phím bỏ lỡ thông tin này.  
**Fix:** "trust-badge tooltip trigger bằng cả `hover` và `focus`. Tooltip dùng `role='tooltip'` + `aria-describedby` link với badge element."

#### H-4 — Thông báo screen reader cho AI pending state và listing lifecycle
**Location:** EXPERIENCE.md > State Patterns > AI pending; Listing lifecycle  
**Chi tiết:** "Đang phân tích..." cập nhật khi AI job xong — nếu dùng DOM mutation thông thường, screen reader không thông báo. Cần `aria-live="polite"` container. Tương tự: khi listing chuyển PENDING → PUBLISHED, banner vàng có được announce không?  
**Fix:** "ai-insight-card container có `aria-live='polite'`; khi content thay đổi từ 'Đang phân tích...' sang kết quả, screen reader tự announce. Listing status banner có `role='status'`."

---

### MEDIUM

#### M-1 — Form validation: thiếu spec liên kết lỗi với input
**Location:** EXPERIENCE.md > Accessibility Floor; Component Patterns > multi-step-form  
**Chi tiết:** Spine ghi "lỗi đọc được bởi screen reader (aria-describedby)" — đúng hướng nhưng chưa đủ chi tiết. Cần spec:
- `aria-invalid="true"` trên input khi lỗi
- `aria-describedby="[error-id]"` liên kết với error message
- Error message có `role="alert"` hay nằm trong `aria-live` region?
- Màu đỏ không được là dấu hiệu lỗi DUY NHẤT (SC 1.4.1) — cần icon hoặc text label kèm theo.

**Fix:** "Input lỗi: `aria-invalid='true'` + `aria-describedby='[field]-error'`. Error text dùng icon (X) + text, không chỉ màu đỏ. shadcn FormMessage component xử lý pattern này — dùng không override."

#### M-2 — Upload ảnh: drag-and-drop không accessible với bàn phím
**Location:** EXPERIENCE.md > Interaction Primitives > Upload ảnh  
**Chi tiết:** Spine ghi "kéo-thả + click" — drag-and-drop không thao tác được bằng bàn phím. Cần đảm bảo luôn có alternative: button "Chọn ảnh" (`<input type="file">`) thao tác được bằng Tab + Enter. Kéo sắp xếp thứ tự ảnh (drag reorder) đặc biệt nguy hiểm — hầu như không ai spec keyboard alternative cho feature này.  
**Fix:** "Upload: luôn có button 'Chọn ảnh' khả thi bằng bàn phím. Drag reorder có alternative bằng button 'Di lên / Di xuống' hoặc `aria-grabbed` + arrow keys (ARIA DnD pattern)."

#### M-3 — Listing card: link text và click target
**Location:** EXPERIENCE.md > Component Patterns > listing-card; DESIGN.md > Components > listing-card  
**Chi tiết:** Listing card "click → detail" — nếu toàn bộ card là một `<a>` thì screen reader sẽ đọc toàn bộ nội dung card làm link text (giá + diện tích + địa chỉ + trust score). Không rõ card có một heading `<h2>/<h3>` không. Listing grid cần heading hierarchy để screen reader navigate bằng H key.  
**Fix:** "Mỗi listing card dùng `<article>` wrapper + `<h3>` cho tên/địa chỉ listing + một `<a>` focused link. Card cũng có link overlay nhưng `aria-hidden='true'` để tránh duplicate. Heading hierarchy: page `<h1>` > section `<h2>` > card `<h3>`."

#### M-4 — Icon-only buttons: thiếu danh sách cụ thể
**Location:** EXPERIENCE.md > Accessibility Floor  
**Chi tiết:** Spine ghi "icon-only button có aria-label" — đúng, nhưng không liệt kê cụ thể button nào trong spine. Dễ bị bỏ qua khi implementation. Từ các flow có thể xác định: close filter drawer (X), retry upload ảnh (retry icon), thứ tự ảnh (up/down), bulk action checkboxes.  
**Fix:** Thêm danh sách tối thiểu vào Accessibility Floor: close drawer (X), retry ảnh, sắp xếp ảnh, save/discard nháp.

#### M-5 — Touch target 44px chưa được nhắc đến trong Responsive spec
**Location:** EXPERIENCE.md > Responsive & Platform  
**Chi tiết:** Spine không đề cập touch target size. shadcn components mặc định thường đạt nhưng badge nhỏ (trust-badge "pill nhỏ góc ảnh"), close icon trong filter, và stepper dot/number có nguy cơ dưới 44px.  
**Fix:** Thêm vào Responsive/Mobile spec: "Touch target tối thiểu 44×44px (WCAG 2.5.5). trust-badge nếu là trigger cho tooltip phải có padding đủ; stepper indicator tối thiểu 44px tap area dù visual nhỏ hơn."

---

### LOW

#### L-1 — Thiếu skip navigation link
**Location:** EXPERIENCE.md > Accessibility Floor  
**Chi tiết:** Không đề cập "skip to main content" link. Người dùng bàn phím trên trang listing browse (có nav + filter bar dài) phải Tab qua nhiều element trước khi tới content chính.  
**Fix:** Thêm hidden skip link đầu `<body>`: `<a href="#main-content" class="sr-only focus:not-sr-only">Bỏ qua điều hướng</a>`.

#### L-2 — Dark mode: emerald dark `#34D399` dùng làm text trên nền sáng
**Location:** DESIGN.md > Colors > accent-dark  
**Chi tiết:** `#34D399` trên `#FFFFFF` cho ratio ~2.3:1 — còn tệ hơn light mode. Dark mode spec chỉ dùng `#34D399` trên nền tối `#111827` (đạt 9.23:1) nhưng nếu component render trên mixed background, sẽ fail. Cần ghi rõ giới hạn này.

#### L-3 — Language declaration
**Location:** Không đề cập trong spine  
**Chi tiết:** `<html lang="vi">` cần được đặt để screen reader dùng đúng TTS engine tiếng Việt. Spine không nhắc — có thể bỏ qua ở lớp Next.js config.  
**Fix:** Ghi chú trong Foundation: "`<html lang='vi'>` bắt buộc. Next.js: set trong `app/layout.tsx`."

#### L-4 — PDF/pháp lý đính kèm listing
**Location:** Không nhắc trong spine nhưng implied bởi PRD  
**Chi tiết:** Nếu có file PDF pháp lý đính kèm listing, cần đảm bảo link download có label rõ (tên file + loại) thay vì chỉ icon download.

---

## Gap Nguy Hiểm Nhất

**Điều sẽ khiến người khuyết tật KHÔNG dùng được sản phẩm:**

1. **Emerald text trên trắng (C-1)** — nếu dev dùng `text-accent` cho bất kỳ text nào (link, label, tag), người thị lực kém không đọc được. Đây là lỗi 1 dòng CSS có thể xuất hiện ở hàng chục nơi trong codebase mà không ai để ý nếu không có lint rule.

2. **Multi-step form không có focus management (H-1)** — form 4 bước là core flow của seller (đăng tin). Người dùng bàn phím hoặc switch access không hoàn thành được form = không đăng được tin = sản phẩm broken hoàn toàn với nhóm này.

3. **Filter drawer không có focus trap (H-2)** — trên mobile (chiếm đa số user), filter là công cụ tìm kiếm chính. Không có focus trap = người dùng VoiceOver/TalkBack không dùng được filter.

---

## Đề Xuất Ưu Tiên Triển Khai

1. **Ngay trong DESIGN.md:** Thêm warning đỏ về C-1 — emerald chỉ là background, không bao giờ là foreground text trên nền sáng.
2. **Trước khi dev form:** Spec đầy đủ H-1 (focus management theo bước, validation focus).
3. **shadcn Sheet component:** Kiểm tra focus trap mặc định — shadcn dùng Radix UI, Radix Sheet có focus trap sẵn, nhưng cần test không ai override `onOpenAutoFocus`.
4. **Lint rule:** Thêm `eslint-plugin-jsx-a11y` vào CI pipeline để catch aria-label thiếu, alt text thiếu sớm.
5. **Checklist manual:** Trước launch, test với VoiceOver (iOS/Safari) cho Flow 2 (tìm tin) và Flow 1 (đăng tin).

---

## Tóm Tắt Điểm Số

| Tiêu chí | Điểm | Ghi chú |
|----------|------|---------|
| Contrast màu | 2/5 | C-1 critical, dark mode OK |
| Keyboard nav | 2/5 | H-1, H-2 unspec |
| Screen reader | 3/5 | Intent đúng, thiếu detail |
| Form a11y | 3/5 | M-1 cần bổ sung |
| Mobile a11y | 3/5 | Touch target chưa spec |
| Media alt text | 4/5 | Đã nhắc, cần danh sách |
| **Tổng thể** | **THIN** | Intent tốt, spec chưa đủ để implement an toàn |

---

*Lưu ý: Full WCAG compliance cần kiểm thử với VoiceOver (iOS), TalkBack (Android), NVDA (Windows) và chuyên gia accessibility. Review này dựa trên spec tĩnh — behavioral issues có thể nhiều hơn khi có code thực.*
