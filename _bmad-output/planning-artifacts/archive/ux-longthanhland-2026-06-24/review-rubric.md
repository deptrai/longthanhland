# Rubric Review — UX Spine Pair bdsai.vn
**Reviewer:** Rubric Walker agent  
**Date:** 2026-06-24  
**Files reviewed:**
- `DESIGN.md` (bdsai.vn brand & style)
- `EXPERIENCE.md` (bdsai.vn experience spine)

**Reference shape:** `design-example-shadcn.md` + `experience-example-shadcn.md` (Drift)

**Sources kiểm tra inheritance:**
- `PRD-marketplace-mvp-v2.md`
- `epics.md`
- `docs/bdsai/ux-design/wireframe-listing-form.md`

---

## Overall Verdict: ADEQUATE — ship với điều kiện

Spine pair đủ để unblock architecture và story-dev với một số điều kiện. Không có lỗi hệ thống. Phần lớn token resolve sạch, flow coverage 3/3 UJ chính có đủ protagonist + climax. Các vấn đề còn lại là thin coverage ở một số state đặc thù, 1 token reference vòng không resolve, và flow "Đăng tin nhanh" thiếu failure path rõ ràng. Không có CRITICAL blocker nào.

---

## Pass 1 — Mechanical Coverage

### 1. Flow Coverage

**Extract từ EXPERIENCE.md:**
- Flow 1: Đăng tin nhanh — Anh Minh, môi giới
- Flow 2: Tìm tin đáng tin — Chị Lan, buyer
- Flow 3: Duyệt tin hiệu quả — Admin

**Đối chiếu PRD/Epics UJ/FR:**
- FR3 (đăng listing) → Flow 1 ✅
- FR5 (browse/search), FR6 (detail), FR7/FR8 (AI/Trust) → Flow 2 ✅
- FR4 (admin approve/reject), FR9 (spam) → Flow 3 ✅
- FR14 (inquiry form) → KHÔNG có flow riêng. Chỉ đề cập cuối Flow 2 bước 5 (1 câu). ⚠️ MEDIUM
- FR16 (listing expire/renew/sold) → KHÔNG có flow nào cover lifecycle từ phía seller. ⚠️ MEDIUM
- FR1/FR2 (đăng ký/đăng nhập) → KHÔNG có flow. LOW — auth thường bỏ ở spine level, chấp nhận được nếu surface `/auth/login` đã có trong IA.

**Protagonist tên có:** Flow 1 (Anh Minh) ✅, Flow 2 (Chị Lan) ✅, Flow 3 (Admin — thiếu tên persona cụ thể) ⚠️ LOW

**Steps đánh số:** cả 3 flow đều có ✅

**Climax beat:** cả 3 flow đều có [CLIMAX] rõ ✅

**Failure path:**
- Flow 1: có failure path upload ảnh ✅, THIẾU failure path "JWT expire giữa submit" dù wireframe-listing-form.md nêu rõ edge case này ⚠️ HIGH
- Flow 2: KHÔNG có failure path (inquiry gửi lỗi? AI chưa có kết quả?) ⚠️ MEDIUM
- Flow 3: KHÔNG có failure path (bulk approve lỗi một phần?) ⚠️ MEDIUM

**Verdict Flow Coverage: ADEQUATE** — 3 UJ chính có flow đủ hình, nhưng thiếu failure paths cho Flow 1 (JWT) và Flow 2/3, và thiếu flow cho FR14/FR16.

---

### 2. Token Completeness

**YAML frontmatter DESIGN.md:**

| Token | Giá trị | Light hex | Dark hex | Đủ? |
|---|---|---|---|---|
| colors.primary | `#111827` | ✅ | ✅ (`primary-dark: #F9FAFB`) | ✅ |
| colors.primary-foreground | `#FFFFFF` | ✅ | ✅ (`primary-foreground-dark: #111827`) | ✅ |
| colors.accent | `#10B981` | ✅ | ✅ (`accent-dark: #34D399`) | ✅ |
| colors.accent-foreground | `#04231A` | ✅ | ✅ (`accent-foreground-dark: #04231A`) | ✅ |
| typography.display | 44px/700 | ✅ | — | ✅ |
| typography.display-sm | 28px/700 | ✅ | — | ✅ |
| rounded.sm/md/lg | 4/8/12px | ✅ | — | ✅ |

**Token references trong prose DESIGN.md:**
- `{colors.primary}` trong button-primary → resolve ✅
- `{colors.accent}` trong trust-badge, ai-insight-card → resolve ✅
- `{colors.card}` trong listing-card → **KHÔNG định nghĩa trong frontmatter** — kế thừa shadcn, prose nói rõ "kế thừa shadcn" ✅ chấp nhận được
- `{colors.border}` trong listing-card → tương tự ✅
- `{rounded.md}`, `{rounded.sm}`, `{rounded.lg}` trong components → resolve ✅

**Token references trong EXPERIENCE.md:**
- `{DESIGN.md}` (dạng tổng thể ở Foundation) → không phải token path cụ thể, chỉ là pointer ✅
- `{components.listing-card}` → resolve sang DESIGN.md components section ✅
- `{components.trust-badge}` → resolve ✅
- `{components.ai-insight-card}` → resolve ✅

**Vấn đề phát hiện:**
- EXPERIENCE.md Foundation ghi `{DESIGN.md}` như thể là 1 token path — không theo convention `{path.to.token}`. Không gây lỗi nhưng inconsistent với pattern của spine. ⚠️ LOW
- DESIGN.md `ai-insight-card` frontmatter dùng `border: '{colors.accent}'` — nhưng prose section Components ghi "border emerald nhạt" (tức là opacity/tint, không phải `#10B981` full). Không nhất quán giữa frontmatter token và prose description. ⚠️ MEDIUM

**Verdict Token Completeness: STRONG** — Light/dark pairs đủ, hex đủ, token path resolve sạch. 1 inconsistency minor giữa frontmatter và prose.

---

### 3. Component Coverage

**Yêu cầu:** mỗi component name có row ở DESIGN.md.Components (visual) VÀ EXPERIENCE.md.Component Patterns (behavioral).

| Component | DESIGN.md | EXPERIENCE.md | Đủ? |
|---|---|---|---|
| trust-badge | ✅ (frontmatter + prose) | ✅ (Component Patterns) | ✅ |
| ai-insight-card | ✅ | ✅ | ✅ |
| listing-card | ✅ | ✅ | ✅ |
| button-primary | ✅ (frontmatter) | KHÔNG có behavioral rule | ⚠️ LOW |
| multi-step-form | KHÔNG có visual row | ✅ behavioral note + wireframe ref | ⚠️ MEDIUM |
| filter-bar | KHÔNG có visual row | ✅ behavioral | ⚠️ MEDIUM |
| stepper | KHÔNG — chỉ implied trong multi-step-form | Đề cập accessibility nhưng không có row riêng | ⚠️ LOW |

**Nhận xét:** `multi-step-form` và `filter-bar` là components phức tạp, có behavioral coverage nhưng DESIGN.md không có visual row nào. Dev cần tự suy luận visual specs từ "kế thừa shadcn". Chấp nhận được nếu shadcn coverage rõ, nhưng filter-bar trên mobile (drawer/sheet) không có visual spec nào. ⚠️ MEDIUM

**Verdict Component Coverage: ADEQUATE** — Brand-specific components đủ cặp, nhưng 2 complex components (multi-step-form, filter-bar) thiếu visual row trong DESIGN.md.

---

### 4. State Coverage

**Đi qua mọi IA surface:**

| Surface | Empty | Loading | Error | Success | Đặc thù | Đủ? |
|---|---|---|---|---|---|---|
| `/listings` (Browse) | ✅ "Không tìm thấy..." | ✅ skeleton | Không rõ (search API lỗi?) | ✅ | filter state URL-shareable ✅ | ⚠️ MEDIUM (thiếu error) |
| `/listings/[id]` (Detail) | N/A | ✅ SSR | 404 không đề cập | ✅ | AI pending ✅ | ⚠️ MEDIUM (thiếu 404) |
| `/my-listings/new` (Form) | N/A | ✅ | ✅ JWT edge case | ✅ PENDING banner | Upload error ✅ | ✅ |
| `/my-listings` (Tin của tôi) | Không đề cập | Không đề cập | Không đề cập | ✅ listing lifecycle | DRAFT/PENDING/PUBLISHED/REJECTED/EXPIRED/SOLD ✅ | ⚠️ MEDIUM (empty/loading/error thiếu) |
| `/inquiries` | Không đề cập | Không đề cập | Không đề cập | Không đề cập | — | ⚠️ HIGH — surface hoàn toàn không có state |
| `/moderation` | Không đề cập | Không đề cập | Không đề cập bulk approve error | ✅ (implied) | spam flag ✅ | ⚠️ MEDIUM |
| `/users` (Admin) | Không đề cập | Không đề cập | Không đề cập | Không đề cập | — | ⚠️ LOW (secondary surface) |
| `/auth/login`, `/auth/register` | N/A | N/A | N/A | N/A | — | LOW — auth surface không có state, nhưng thường không cần ở spine level |

**State Patterns section** có định nghĩa 4-trạng-thái chuẩn (skeleton/empty/error/success) và listing lifecycle chi tiết. Framework tốt nhưng application không đều cho các surface. `/inquiries` hoàn toàn missing — đây là surface có flow trong Flow 2 bước 5.

**Verdict State Coverage: THIN** — Framework được định nghĩa tốt nhưng nhiều surfaces (đặc biệt `/inquiries`, `/my-listings`) thiếu state coverage cụ thể. `/inquiries` là HIGH vì có user flow đến đó.

---

### 5. Visual Reference Coverage

**Files trong docs/bdsai/ux-design/:**
- `wireframe-listing-form.md` — có tồn tại ✅

**Spine có link inline không?**

EXPERIENCE.md:
- Foundation: KHÔNG link `wireframe-listing-form.md` trực tiếp
- Component Patterns `multi-step-form`: ghi "(chi tiết: wireframe-listing-form.md)" ✅ — có tham chiếu text, không phải link markdown
- Không có link `[wireframe-listing-form.md](...)` format
- Không có `mockups/` section như Drift example có (`→ Composition reference: mockups/today.html`)

DESIGN.md:
- KHÔNG link wireframe hay mockup nào

**Vấn đề:** wireframe-listing-form.md được sources YAML frontmatter của cả 2 files ✅ nhưng không được inline link trong prose. Drift example có "→ Composition reference:" section rõ ràng — bdsai spine thiếu pattern này. ⚠️ MEDIUM — dev không biết wireframe nào cover surface nào nếu không đọc toàn bộ sources list.

**Verdict Visual Reference Coverage: THIN** — Wireframe được list ở sources nhưng không có inline anchor rõ ràng trong prose. Drift pattern "→ Composition reference" không được follow.

---

## Pass 2 — Judgment

### 6. Bloat & Overspecification

**Verdict: STRONG (không bloat)**

- DESIGN.md đúng brand-layer-only pattern. Kế thừa shadcn được tuyên bố rõ, không over-specify shadcn components.
- EXPERIENCE.md behavioral-only, không lẫn visual specs vào prose.
- Frontmatter YAML đủ compact. Prose sections ngắn gọn.
- Duy nhất hơi thừa: DESIGN.md `[ASSUMPTION]` annotations trong frontmatter — hữu ích cho Luis nhưng sẽ gây confuse cho downstream developer nếu không xóa sau approval.

---

### 7. Inheritance Discipline

**Verdict: ADEQUATE**

**Tốt:**
- Cả 2 file list đúng sources trong YAML frontmatter
- Tên persona nhất quán với PRD (Anh Minh, Chị Lan, Admin)
- FR coverage map epics.md → flow coverage hợp lý
- Track B scope exclusion nhất quán (EXPERIENCE.md, wireframe-listing-form.md, epics.md đều nói Track B BLOCKED)
- EXPERIENCE token ref `{components.X}` resolve tới DESIGN.md

**Vấn đề:**
- DESIGN.md sources `ARCHITECTURE-SPINE.md` nhưng file đó **không được đọc** trong rubric review này. Không thể verify resolve. ⚠️ NOTE — nếu ARCHITECTURE-SPINE.md có quyết định ảnh hưởng visual (AD-4 SSR, AD-7 WebP) thì spine đã cite đúng source, chỉ cần kiểm tra lại nếu có conflict.
- FR16 (listing expire/renew/sold) có trong listing lifecycle states ✅ nhưng không có flow consumer rõ ràng — seller không có use case "gia hạn tin" được walk through.
- EXPERIENCE.md nêu `Next.js 16` ở Foundation nhưng PRD và DESIGN.md cũng nêu `Next.js 16` — nhất quán ✅.

---

### 8. Shape Fit

**Verdict: ADEQUATE**

**DESIGN.md shape check (canonical order: Brand & Style → Colors → Typography → Layout → Shapes → Components → Do/Don't):**
- Brand & Style ✅
- Colors ✅
- Typography ✅
- Layout & Spacing ✅
- Shapes ✅
- Components ✅
- Do's and Don'ts ✅
- Canonical order match ✅ — **STRONG shape fit cho DESIGN.md**

**EXPERIENCE.md shape check (required sections: Foundation → IA → Voice/Tone → Component Patterns → State Patterns → Interaction Primitives → Accessibility Floor → Responsive & Platform → Key Flows → Inspiration & Anti-patterns):**
- Foundation ✅
- Information Architecture ✅
- Voice and Tone ✅
- Component Patterns ✅
- State Patterns ✅
- Interaction Primitives ✅
- Accessibility Floor ✅
- Responsive & Platform ✅
- Key Flows ✅
- Inspiration & Anti-patterns ✅
- **Tất cả required sections present** — **STRONG shape fit cho EXPERIENCE.md**

Drift example có `State Patterns` dạng table (surface × state) — bdsai EXPERIENCE.md dùng prose list, kém scannable hơn nhưng không phải lỗi shape. ⚠️ LOW improvement suggestion.

---

## Mechanical Notes

| # | File | Location | Severity | Mô tả |
|---|---|---|---|---|
| M1 | EXPERIENCE.md | Flow 1 step 3-4 | HIGH | Thiếu failure path JWT expire giữa submit (edge case định nghĩa rõ trong wireframe-listing-form.md nhưng không xuất hiện trong flow) |
| M2 | EXPERIENCE.md | `/inquiries` surface | HIGH | Surface có trong IA nhưng KHÔNG có state definitions (empty/loading/error/success) và không có flow |
| M3 | EXPERIENCE.md | Flow 2, Flow 3 | MEDIUM | Thiếu failure paths (inquiry API lỗi; bulk approve partial failure) |
| M4 | DESIGN.md | frontmatter `ai-insight-card.border` vs prose | MEDIUM | Inconsistency: frontmatter dùng `'{colors.accent}'` (full emerald `#10B981`) nhưng prose ghi "border emerald nhạt" — tint/opacity không định nghĩa |
| M5 | EXPERIENCE.md | Component Patterns | MEDIUM | `multi-step-form` và `filter-bar` có behavioral coverage nhưng DESIGN.md không có visual row tương ứng |
| M6 | EXPERIENCE.md | State Patterns | MEDIUM | `/my-listings` (Tin của tôi) thiếu empty/loading/error states; chỉ có listing lifecycle states |
| M7 | EXPERIENCE.md | Prose | MEDIUM | Wireframe-listing-form.md không có inline anchor rõ trong prose (chỉ mention text, không có "→ Composition reference:" section như Drift pattern) |
| M8 | EXPERIENCE.md | Flow coverage | MEDIUM | FR14 (inquiry form từ buyer) và FR16 (expire/renew/sold) không có flow — FR14 đặc biệt vì có user journey đến surface `/inquiries` |
| M9 | DESIGN.md | frontmatter comments | LOW | `[ASSUMPTION]` annotations hữu ích cho author nhưng nên strip trước khi mark final |
| M10 | EXPERIENCE.md | Foundation | LOW | `{DESIGN.md}` dùng như token pointer — không theo convention `{path.to.token}`, inconsistent |
| M11 | EXPERIENCE.md | Flow 3 | LOW | Admin persona không có tên cụ thể (so với Anh Minh, Chị Lan — nhỏ nhưng inconsistent với PRD Section 2.3 chỉ có mô tả không tên) |
| M12 | EXPERIENCE.md | State Patterns | LOW | `/listings` (Browse) thiếu error state khi search API lỗi |

---

## Tổng kết Severity Count

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 (M1, M2) |
| MEDIUM | 6 (M3–M8) |
| LOW | 4 (M9–M12) |

---

## Điều kiện để APPROVE spine

1. **MUST fix trước khi downstream consume:**
   - M1: Thêm failure path JWT expire vào Flow 1 (1-2 câu là đủ, pattern đã có trong wireframe)
   - M2: Thêm state definitions cho `/inquiries` surface (4 states cơ bản + 1 câu empty CTA)

2. **SHOULD fix trong iteration tiếp theo (không block ngay):**
   - M4: Làm rõ `ai-insight-card border` — full emerald hay tint? Commit 1 giá trị.
   - M5: Thêm visual row cho `multi-step-form` và `filter-bar` vào DESIGN.md hoặc ghi rõ "100% shadcn Sheet/Form"
   - M7: Thêm "→ Wireframe reference: `docs/bdsai/ux-design/wireframe-listing-form.md` (covers `/my-listings/new` step flow)"

3. **NICE to have:**
   - M3, M6, M8: failure paths và state gap còn lại
   - M9: Strip `[ASSUMPTION]` trước khi mark `status: final`
