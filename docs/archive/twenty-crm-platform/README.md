# Cấu Trúc Thư Mục Dự Án Nền Tảng Bất Động Sản

## 📁 Tổng Quan Cấu Trúc

```
docs/real-estate-platform/
├── 01-planning/              # Tài liệu lập kế hoạch & phân tích
├── 02-architecture/          # Kiến trúc hệ thống
├── 03-technical-specs/       # Đặc tả kỹ thuật
├── 04-ux-design/            # Thiết kế UX
├── 05-cost-estimates/       # Báo giá & ước tính chi phí
├── 06-implementation/       # Tài liệu triển khai
└── mockups/                 # Mockup HTML
```

---

## 📂 Chi Tiết Từng Thư Mục

### 01-planning/ (Lập Kế Hoạch)
**Mục đích**: Tài liệu PRD, phân tích kinh doanh, kế hoạch sprint

| File | Mô tả |
|------|-------|
| `prd-v1.0.md` | PRD đầy đủ (36 tháng, web + mobile + AI) |
| `PRD-public-marketplace.md` | PRD sàn giao dịch công khai |
| `epics.md` | Danh sách tất cả Epic |
| `sprint-plan.md` | Kế hoạch sprint |
| `sprint-status.yaml` | Trạng thái sprint |
| `business-feasibility-analysis.md` | Phân tích khả thi kinh doanh |
| `public-marketplace-business-analysis.md` | Phân tích kinh doanh marketplace |
| `public-marketplace-specification.md` | Đặc tả marketplace |
| `EPIC-2-FRONTEND-IMPLEMENTATION.md` | Triển khai frontend Epic 2 |
| `EPIC-8-ADJUSTED-ESTIMATES.md` | Ước tính điều chỉnh Epic 8 |

---

### 02-architecture/ (Kiến Trúc)
**Mục đích**: Tài liệu kiến trúc hệ thống, validation

| File | Mô tả |
|------|-------|
| `architecture.md` | Kiến trúc tổng thể |
| `architecture-custom-build.md` | Kiến trúc custom build |
| `architecture-validation-report.md` | Báo cáo validation kiến trúc |
| `architecture-validation-nextjs-vs-ssr.md` | So sánh Next.js vs SSR |

---

### 03-technical-specs/ (Đặc Tả Kỹ Thuật)
**Mục đích**: Đặc tả kỹ thuật chi tiết cho từng Epic

| File | Mô tả |
|------|-------|
| `tech-spec-epic-1.md` | Epic 1: Foundation & Setup |
| `tech-spec-epic-2.md` | Epic 2: Property Inventory Management |
| `tech-spec-epic-3.md` | Epic 3: Customer & Deal Management |
| `tech-spec-epic-4.md` | Epic 4: Sales Agent Tools |
| `tech-spec-epic-5.md` | Epic 5: Commission Management |
| `tech-spec-epic-6.md` | Epic 6: Lead Distribution & Automation |
| `tech-spec-epic-7.md` | Epic 7: Operations & Scale |

---

### 04-ux-design/ (Thiết Kế UX)
**Mục đích**: Tài liệu thiết kế UX, wireframe, user flow

| File | Mô tả |
|------|-------|
| `ux-design-epic-2.md` | UX Design Epic 2 (Property Management) |
| `ux-design-epic-3.md` | UX Design Epic 3 (Customer & Deal) |
| `ux-design-epic-4.md` | UX Design Epic 4 (Sales Agent Tools) |
| `ux-design-epic-5-6-7.md` | UX Design Epic 5-6-7 (Commission, Lead, Operations) |

---

### 05-cost-estimates/ (Báo Giá)
**Mục đích**: Báo giá chi tiết (tiếng Anh & tiếng Việt)

| File | Mô tả | Chi phí |
|------|-------|---------|
| **Tiếng Anh** | | |
| `PROJECT-COST-ESTIMATE-WEB-PLATFORM.md` | Báo giá nền tảng web (8 tháng) | 720M VND |
| `PROJECT-COST-ESTIMATE-FULL-PLATFORM.md` | Báo giá nền tảng đầy đủ (36 tháng) | 17.32B VND |
| `PROJECT-COST-ESTIMATE-BUDGET-OPTIMIZED.md` | Báo giá tối ưu ngân sách (cũ) | 430M VND |
| **Tiếng Việt** | | |
| `BAO-GIA-NEN-TANG-WEB.md` | Báo giá nền tảng web (8 tháng) | 720 triệu VND |
| `BAO-GIA-NEN-TANG-DAY-DU.md` | Báo giá nền tảng đầy đủ (36 tháng) | 17.32 tỷ VND |

---

### 06-implementation/ (Triển Khai)
**Mục đích**: Tài liệu triển khai, hướng dẫn, phân tích

| File | Mô tả |
|------|-------|
| `implementation-readiness-report.md` | Báo cáo sẵn sàng triển khai |
| `frontend-architecture-analysis.md` | Phân tích kiến trúc frontend |
| `quick-start-custom-build.md` | Hướng dẫn nhanh custom build |

---

### mockups/ (Mockup)
**Mục đích**: Mockup HTML tương tác

| File | Mô tả |
|------|-------|
| `epic-2-mockup.html` | Mockup Epic 2 |
| `epic-8-mockup.html` | Mockup Epic 8 (Public Marketplace) |
| `epic-8-full-mockup.html` | Mockup Epic 8 đầy đủ |
| `epic-8-full.html` | Mockup Epic 8 full |

---

## 🎯 Hướng Dẫn Sử Dụng

### Cho Khách Hàng / Nhà Đầu Tư:
1. **Bắt đầu với**: `05-cost-estimates/BAO-GIA-NEN-TANG-WEB.md` hoặc `BAO-GIA-NEN-TANG-DAY-DU.md`
2. **Xem chi tiết**: `01-planning/prd-v1.0.md`
3. **Xem mockup**: `mockups/epic-8-full-mockup.html`

### Cho Đội Phát Triển:
1. **Bắt đầu với**: `01-planning/prd-v1.0.md`
2. **Kiến trúc**: `02-architecture/architecture.md`
3. **Đặc tả kỹ thuật**: `03-technical-specs/tech-spec-epic-*.md`
4. **Thiết kế UX**: `04-ux-design/ux-design-epic-*.md`
5. **Triển khai**: `06-implementation/quick-start-custom-build.md`

### Cho Product Manager:
1. **PRD**: `01-planning/prd-v1.0.md`
2. **Epics**: `01-planning/epics.md`
3. **Sprint**: `01-planning/sprint-plan.md`
4. **Phân tích**: `01-planning/business-feasibility-analysis.md`

---

## 📊 Tóm Tắt Dự Án

### Phạm Vi:
- **Giai đoạn 1-3.5** (8 tháng): Nền tảng Web (CRM + Marketplace + Crawling)
- **Giai đoạn 5-8** (28 tháng): Mobile App (iOS + Android)
- **Tổng**: 36 tháng

### Chi Phí:
- **Web Only**: 720 triệu VND (8 tháng)
- **Full Platform**: 17.32 tỷ VND (36 tháng)

### Đội Ngũ:
- **Web Only**: 4 người
- **Full Platform**: 4 → 80 người

### Công Nghệ:
- **Frontend**: React 18, Next.js 16, TypeScript
- **Backend**: NestJS 11, PostgreSQL 15, Drizzle ORM
- **Mobile**: React Native
- **AI**: OpenAI GPT-4, Perplexica
- **Crawling**: Scrapy, Playwright, Apache Airflow

---

## 🔄 Lịch Sử Cập Nhật

| Ngày | Thay đổi |
|------|----------|
| 2026-02-09 | Sắp xếp lại cấu trúc thư mục |
| 2026-02-09 | Thêm báo giá tiếng Việt |
| 2026-02-09 | Cập nhật báo giá realistic (720M & 17.32B) |
| 2026-02-09 | Thêm Epic 9: Web Crawling vào PRD v1.0 |

---

**Cập nhật lần cuối**: 9 tháng 2, 2026
**Người chuẩn bị**: Đội Phát triển

