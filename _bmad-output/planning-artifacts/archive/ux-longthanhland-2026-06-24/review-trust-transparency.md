# Review: Trust & Transparency — UX Spine bdsai.vn
**Reviewer role:** Trust & Transparency specialist
**Ngày:** 2026-06-24
**Files reviewed:**
- `DESIGN.md` — brand/visual specs
- `EXPERIENCE.md` — behavioral spine
- `PRD-marketplace-mvp-v2.md` — Section 11 Compliance
- `ARCHITECTURE-SPINE.md` — AD-8 Data Privacy

---

## Verdict tổng

UX spine có **nền tảng trust tốt về mặt ý định** — disclaimer AI có mặt, tooltip trên trust-badge được đề cập, accent emerald dành riêng cho tín hiệu tin cậy. Tuy nhiên còn **3 lỗ hổng critical/high** có thể phá vỡ niềm tin của chị Lan (buyer sợ lừa đảo) hoặc gây rủi ro pháp lý thật cho sản phẩm: (1) trust-badge không phân biệt rõ "điểm thấp = ít data" vs "điểm thấp = nghi ngờ gian lận", (2) đường appeal của seller bị điểm thấp chỉ được nhắc ở PRD chứ chưa xuất hiện trong UX spine, (3) ai-insight-card thiếu cơ chế phân biệt rõ ràng với nội dung người thật ở cấp behavioral. Các vấn đề medium/low liên quan đến PII Track B và microcopy cụ thể có thể xử lý ở sprint sau.

---

## Findings theo severity

---

### CRITICAL — C1: Trust Score thấp = lừa đảo? Không có phân biệt UX

**Location:** `EXPERIENCE.md` — Flow 2, bước 2: *"chị bỏ qua tin điểm thấp"* + `EXPERIENCE.md` — Component Patterns: `trust-badge` hiện "Đang đánh giá" (tin mới) kèm tooltip.

**Vấn đề:**
Spine mô tả chị Lan "bỏ qua tin điểm thấp" như một kết quả tự nhiên — nhưng không có UX nào phân biệt hai nguyên nhân rất khác nhau dẫn đến điểm thấp:

- **Thiếu data** (seller mới, tin mới, chưa đủ lịch sử xác minh) → không phải lừa đảo
- **Tín hiệu tiêu cực thật** (ảnh không khớp, giá bất thường, metadata đáng ngờ)

Buyer sẽ tự hiểu "điểm thấp = không tin được = có thể lừa đảo". Với seller mới hoàn toàn bình thường, đây là **false negative** gây thiệt hại cho họ và làm mất nguồn cung tin lành mạnh trên sàn.

**Rủi ro thêm:** "Đang đánh giá" badge không nói lên được ý nghĩa → buyer có thể đọc là "chưa được duyệt = đáng ngờ".

**Fix:**
Spine phải định nghĩa ít nhất 2 sub-state rõ ràng trong trust-badge:
- **"Chưa đủ dữ liệu"** (màu neutral/muted, KHÔNG phải đỏ, KHÔNG phải emerald) — dành cho tin mới, seller mới
- **"Điểm tín nhiệm: XX/100"** (emerald gradient hoặc neutral tùy mức) — khi đã có đủ data
- Tooltip PHẢI giải thích hai loại này bằng ngôn ngữ người dùng thường. Ví dụ: *"Tin mới — AI chưa đủ dữ liệu để đánh giá. Không có nghĩa là tin giả."*

Ngoài ra, trên listing detail, khu vực trust-badge nên hiển thị ngắn gọn lý do chính: *"Điểm cao vì: seller đã xác minh SĐT, ảnh thực, giá phù hợp thị trường."*

---

### CRITICAL — C2: Đường appeal của seller không có trong UX spine

**Location:** `PRD-marketplace-mvp-v2.md` Section 11.3 quy định *"Có quy trình appeal cho seller khi tin bị gắn nhãn điểm thấp"*. `EXPERIENCE.md` — không có dòng nào nhắc đến appeal.

**Vấn đề:**
PRD yêu cầu quy trình appeal nhưng EXPERIENCE.md hoàn toàn không định nghĩa:
- Appeal xuất hiện ở đâu trong IA (Information Architecture)? Không có surface nào.
- Trigger appeal là gì? (seller thấy điểm thấp → CTA ở đâu?)
- Flow appeal trông như thế nào? (form? ticket? email?)
- Seller nhận phản hồi thế nào và bao lâu?

Thiếu appeal UX vừa là **rủi ro pháp lý** (Section 11.3 không được implement), vừa là **rủi ro trust** — seller bị điểm thấp oan mà không có cách nào phản hồi sẽ rời sàn và nói xấu sản phẩm.

**Fix:**
Spine cần bổ sung:
1. Surface `/my-listings/[id]/appeal` hoặc modal appeal ngay trên dashboard seller khi tin có điểm thấp.
2. CTA rõ ràng: *"Điểm tín nhiệm thấp hơn bạn mong đợi? Gửi yêu cầu xem xét lại"* — xuất hiện khi điểm dưới ngưỡng (cần định nghĩa ngưỡng trong PRD/Epic M4.4).
3. State lifecycle: APPEAL_PENDING / APPEAL_RESOLVED với thông báo kết quả cho seller.
4. Admin surface `/moderation` cần thêm tab "Yêu cầu xem xét điểm" bên cạnh queue duyệt tin.

---

### HIGH — H1: ai-insight-card thiếu phân biệt behavioral rõ ràng với nội dung người thật

**Location:** `DESIGN.md` — component `ai-insight-card`: *"luôn có nhãn 'AI' + disclaimer"*. `EXPERIENCE.md` — Component Patterns: *"luôn có nhãn 'AI' + disclaimer; nếu chưa có kết quả → ẩn gọn"*.

**Vấn đề:**
Spine có nhắc "nhãn AI + disclaimer" nhưng không định nghĩa behavior cụ thể:
- Nhãn "AI" ở đâu chính xác? (góc trên? dưới? inline với text?)
- Disclaimer full text ở đâu? (luôn hiện, hay cần click "xem thêm"?)
- ai-insight-card có thể nằm cạnh phần mô tả do seller tự nhập — buyer phân biệt bằng gì nếu chỉ dựa vào border emerald nhạt?

Trên mobile, border emerald mỏng dễ bị mắt bỏ qua. Nếu ai-insight-card và seller description có cùng font size, cùng ngôn ngữ tiếng Việt, buyer có thể đọc AI summary như thể seller nói — đây là **AI giả danh người thật** dù không cố ý.

**Fix:**
- Behavioral spec cần định nghĩa: header card PHẢI có label dạng chip/badge rõ: *"Phân tích bởi AI · bdsai.vn"* — không chỉ là border màu.
- Disclaimer *"Điểm tham khảo do AI tạo, không phải xác nhận pháp lý"* phải luôn hiển thị inline (không ẩn sau click), font size nhỏ hơn nhưng không bị muted đến mức invisible.
- Nội dung seller description và ai-insight-card phải có visual separator rõ (section heading "Mô tả của người bán" vs "Phân tích AI") — spine hiện chưa định nghĩa layout detail page đủ rõ.

---

### HIGH — H2: Trust Score trên listing-card (grid view) thiếu context — dễ bị đọc sai nhất

**Location:** `EXPERIENCE.md` — Component Patterns: *"listing-card: trust-badge overlay góc ảnh"*. `DESIGN.md` — `trust-badge`: *"pill nhỏ góc ảnh bìa"*.

**Vấn đề:**
Listing-card trên grid hiện con số (ví dụ "72") dạng pill nhỏ trên góc ảnh — không có label, không có context. Với người dùng lần đầu (chị Lan chưa dùng bao giờ):
- "72" nghĩa là gì? 72/100? 72%? 7.2 sao?
- Tại sao tin này 72 và tin kia 45?
- "Đang đánh giá" trên grid trông như gì — và buyer sẽ hiểu thế nào?

Grid view là điểm tiếp xúc đầu tiên, nơi buyer hình thành ấn tượng và quyết định click. Nếu trust-badge không self-explanatory ở đây, toàn bộ USP "AI Trust Score" mất giá trị.

**Fix:**
- Trên grid card: badge hiện *"Tin cậy: 72"* hoặc icon shield + số, kèm tooltip ngắn khi hover/tap: *"Điểm tín nhiệm AI — bấm để tìm hiểu"*.
- Cần thêm legend/onboarding hint lần đầu (có thể là banner nhỏ trên đầu grid, đóng được): *"Điểm tín nhiệm AI giúp bạn chọn tin đáng tin hơn. Tìm hiểu cách tính →"*

---

### MEDIUM — M1: Seller mới bị thiệt thòi — không có UX giải thích hành trình tăng điểm

**Location:** `EXPERIENCE.md` — Flow 1 (anh Minh): sau khi đăng tin, tin chuyển PENDING rồi PUBLISHED — không có mention gì về Trust Score của tin mới.

**Vấn đề:**
Anh Minh đăng tin xong, tin được duyệt, xuất hiện trên grid với badge "Đang đánh giá" hoặc điểm thấp. Anh không biết:
- Điểm thấp vì lý do gì?
- Phải làm gì để tăng điểm (xác minh SĐT, thêm ảnh, cập nhật thông tin)?
- Bao lâu thì AI đánh giá xong?

Không có progression UX → anh Minh cảm thấy sàn "đối xử bất công" với người mới. Nguy cơ churn seller mới cao.

**Fix:**
Dashboard `/my-listings` cần hiển thị với mỗi tin: trust score hiện tại + "Để tăng điểm: [checklist gợi ý]" (xác minh SĐT, thêm ảnh rõ, điền đầy đủ thông tin). Đây là UX đơn giản nhưng tạo ra vòng lặp cải thiện tích cực thay vì cảm giác bị phạt.

---

### MEDIUM — M2: PII Track B — spine chưa lường trước đủ dù đã gating

**Location:** `EXPERIENCE.md` header: *"Track B (promotion/import UI) BỎ — chờ gỡ gate Xaction"*. `ARCHITECTURE-SPINE.md` AD-8: KHÔNG lưu `sellerPhone`/`sellerName` raw từ crawl.

**Vấn đề:**
Spine đúng khi gate Track B. Nhưng khi Track B được mở, UX cần xử lý một tình huống nhạy cảm: imported listing có thể hiển thị thông tin người bán từ nguồn crawl. AD-8 quy định hash phone, không lưu raw — nhưng spine chưa có behavioral spec cho:
- Imported listing hiển thị với buyer như thế nào? (Có label "tin nhập từ nguồn ngoài" không?)
- Seller info trên imported listing được ẩn/hiện thế nào?
- Buyer liên hệ seller qua imported listing — flow thế nào khi không có seller account thật trên sàn?

**Fix:**
Bổ sung note trong spine (dù gating): khi Track B mở, imported listing PHẢI có label rõ "Tin tổng hợp từ nguồn ngoài · bdsai.vn không xác minh" — tránh buyer hiểu nhầm đây là tin đã được duyệt như Track A. Đây cũng bảo vệ sản phẩm về mặt pháp lý.

---

### LOW — L1: Microcopy disclaimer chưa đủ thân thiện với người dùng phổ thông

**Location:** `EXPERIENCE.md` — Voice and Tone: *"AI insight disclaimer: luôn kèm 'Điểm tham khảo do AI tạo, không phải xác nhận pháp lý'"*.

**Vấn đề:**
Cụm từ "xác nhận pháp lý" hơi nặng/kỹ thuật với chị Lan 28 tuổi, nhân viên văn phòng. Ngược lại nếu quá nhẹ thì mất tác dụng disclaimer. Cần cân bằng.

**Fix:**
Thử: *"Phân tích tự động bởi AI — chỉ mang tính tham khảo, không thay thế thẩm định chuyên nghiệp."* Thân thiện hơn nhưng vẫn rõ giới hạn.

---

### LOW — L2: Dark pattern tiềm năng — emerald overuse risk

**Location:** `DESIGN.md` — Colors: *"Emerald = 'đã xác nhận / đáng tin'"*. Rules: *"chỉ dùng cho tín hiệu tin cậy"*.

**Vấn đề:**
Kỷ luật "chỉ emerald cho trust signal" rất tốt về mặt nguyên tắc. Nhưng nếu developer/designer tương lai dùng emerald cho button CTA, success toast, hay progress bar — buyer sẽ vô thức liên kết emerald với "đã tin cậy" dù đối tượng không phải trust signal. Spine hiện chỉ có Do/Don't text, không có enforcement mechanism.

**Fix:**
Low priority nhưng nên thêm ví dụ phản ví dụ cụ thể trong DESIGN.md: *"KHÔNG dùng emerald cho: nút 'Đăng ký', toast 'Lưu thành công', progress bar upload ảnh."*

---

## Đánh giá tổng về niềm tin người dùng

**So với Facebook group** — UX này có tiến bộ thực chất: disclaimer AI có mặt, listing lifecycle rõ ràng, admin duyệt tin trước khi publish. Chị Lan sẽ cảm thấy sàn có cơ cấu hơn Facebook.

**Điểm yếu phá vỡ niềm tin lớn nhất** là C1: khi chị Lan thấy tin điểm thấp mà không hiểu tại sao thấp, thay vì cảm thấy "sàn đang bảo vệ mình", chị cảm thấy "sàn đang giấu gì đó". Minh bạch thật sự nghĩa là giải thích được lý do — không chỉ hiện con số.

**Kết luận:** Fix C1 + C2 trước khi ship M4.4 (Display AI insights). H1 + H2 fix trong cùng sprint đó. M1 + M2 có thể defer sang sprint tiếp theo nhưng không nên để quá 1 sprint sau launch.

---

*Báo cáo này không sửa file DESIGN.md hay EXPERIENCE.md — chỉ critique. Áp dụng theo quyết định của team.*
