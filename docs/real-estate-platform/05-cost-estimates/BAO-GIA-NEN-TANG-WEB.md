# PropConnect Vietnam - Báo Giá Nền Tảng Web (6 Tháng)

> **PropConnect Vietnam** - Hệ sinh thái Bất Động Sản thông minh: Marketplace + CRM + AI

**Phiên bản**: 2.0
**Ngày**: 9 tháng 2, 2026
**Đơn vị tiền tệ**: VND (Việt Nam Đồng)
**Phạm vi**: Nền Tảng Web (Phase 1-3)
**Đơn giá nhân sự**: 300,000 VND/giờ (quy chuẩn)

---

## Tóm Tắt Điều Hành

### Tổng Chi Phí Phát Triển Năm 1: **720,000,000 VND** (~2,400 giờ × 300K/h)

**Hai Sản Phẩm Cốt Lõi** (tương hỗ lẫn nhau):

```
┌─────────────────────────────────────────────────────────────────┐
│                    PropConnect Vietnam                          │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────┐            │
│  │   MARKETPLACE    │ ◄─────► │      CRM          │            │
│  │  (Thu Leads &    │  Leads  │  (Tối Ưu Lợi     │            │
│  │   Dữ Liệu)      │ ─────► │   Nhuận)           │            │
│  │                  │         │                    │            │
│  │ • Đăng tin BĐS   │ ◄───── │ • Quản lý 1000+   │            │
│  │ • AI Search      │ Listings│   agents           │            │
│  │ • Điểm Tin Cậy   │         │ • Hoa hồng tự động│            │
│  │ • Affiliate      │ Data    │ • Pipeline giao    │            │
│  │   (Credit-based) │ ─────► │   dịch             │            │
│  │ • Cạnh tranh     │         │ • Affiliate        │            │
│  │   BDS.com.vn     │ Market  │   (Cash-based)     │            │
│  │   & Chợ Tốt      │ Intel  │ • Bán data leads   │            │
│  └──────────────────┘ ◄───── └──────────────────┘            │
│                                                                 │
│  ┌──────────────────────────────────────────────┐              │
│  │          WEB CRAWLING & AI ENGINE            │              │
│  │  Thu thập dữ liệu → Phân tích → Insights    │              │
│  └──────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Ngân Sách Theo Phase**:
- **Phase 1**: CRM Basic + Marketplace Basic — **300,000,000 VND** (3 tháng)
- **Phase 2**: CRM Nâng Cao (dừng) + Marketplace Nâng Cao + Basic Crawling — **270,000,000 VND** (3 tháng)
- **Phase 3**: Marketplace Pro + Crawling Nâng Cao + Affiliate — **150,000,000 VND** (song song)

**Thời Gian**: 6 tháng (Phase 3 chạy song song Tháng 3-6)
**Đội Ngũ**: 4 người (1 FE, 1 BE, 1 Python Dev, 1 QA)

**Chi Phí Năm 2+**:
- Chi phí vận hành: ~250,000,000 VND/năm (bảo trì 10% + server + API)
- Chi phí phát triển thêm: *Chưa tính được* (tùy theo nhu cầu mở rộng)

**Marketplace vs CRM — Hai Dự Án, Một Hệ Sinh Thái**:

| | **Marketplace** | **CRM** |
|---|---|---|
| **Mục tiêu** | Thu leads, dữ liệu thị trường, điều phối thị trường | Tối ưu nguồn thu từ leads, phát triển đội ngũ CTV |
| **Đối thủ** | Batdongsan.com.vn, Chợ Tốt Nhà Đất | Không có đối thủ trực tiếp (niche) |
| **Lợi thế** | Phí rẻ hơn + chất lượng tốt hơn đối thủ | Tự động hóa + AI + Affiliate offline |
| **Doanh thu** | Đăng tin, quảng cáo, subscription | Hoa hồng, bán leads, CTV network |
| **Affiliate** | Credit-based (dùng trên nền tảng) | Cash-based (rút tiền thật) |
| **Vai trò** | **Thu** leads & data | **Biến** leads thành tiền |

**Những Gì Bạn Nhận Được**:
- ✅ **Marketplace**: Sàn đăng tin BĐS cạnh tranh trực tiếp với BDS.com.vn & Chợ Tốt
- ✅ **CRM**: Hệ thống quản lý 1000+ agents, tối ưu hoa hồng & leads
- ✅ **AI Engine**: 5 tính năng AI (nghiên cứu, tin cậy, tóm tắt, lọc spam, chatbot)
- ✅ **Web Crawling**: Thu thập 10K+ tin đăng/ngày từ đối thủ
- ✅ **Dual Affiliate**: Credit-based (Marketplace) + Cash-based (CRM)
- ✅ Kiến trúc sẵn sàng cho mobile

---

## 1. Chi Phí Chi Tiết Theo Phase

### Phase 1: CRM Basic + Marketplace Basic (300 Triệu VND)

**Thời gian**: 3 tháng (Tháng 1-3)
**Giờ công**: ~1,000 giờ × 300K = 300,000,000 VND

**Mục tiêu**: Xây dựng nền tảng cơ bản cho CẢ HAI sản phẩm song song

#### 1A. CRM Basic (~600 giờ)

| Module | Giờ | Chi phí (VND) | Chi tiết |
|--------|-----|---------------|----------|
| Nền tảng & Auth | 80 | 24,000,000 | Setup, RBAC, phân quyền |
| Quản lý Kho BĐS | 100 | 30,000,000 | CRUD, đặt chỗ, trạng thái |
| Quản lý Khách Hàng | 80 | 24,000,000 | CRUD, timeline, bảo mật |
| Quản lý Giao Dịch | 80 | 24,000,000 | Pipeline, theo dõi thanh toán |
| Dashboard Kinh Doanh | 60 | 18,000,000 | KPI, bảng xếp hạng |
| Hoa Hồng Basic | 60 | 18,000,000 | Tính toán, phê duyệt |
| Phân Phối Lead Basic | 60 | 18,000,000 | Tự động phân, cân bằng tải |
| Background Jobs | 40 | 12,000,000 | BullMQ, email, cron |
| Admin Tools | 40 | 12,000,000 | Quản lý user, cài đặt |
| **Tổng CRM Basic** | **600** | **180,000,000** | |

#### 1B. Marketplace Basic (~300 giờ)

| Module | Giờ | Chi phí (VND) | Chi tiết |
|--------|-----|---------------|----------|
| Setup Next.js SSR | 40 | 12,000,000 | SEO, Turbopack |
| Trang Chủ + Duyệt | 60 | 18,000,000 | Hero, search, lưới tin |
| Trang Chi Tiết | 40 | 12,000,000 | Slider ảnh, bản đồ |
| Đăng Tin Basic | 40 | 12,000,000 | CRUD tin đăng, upload ảnh |
| Auth Công Khai | 30 | 9,000,000 | Đăng ký/đăng nhập |
| Bộ Lọc & Tìm Kiếm | 40 | 12,000,000 | Lọc nâng cao, sắp xếp |
| Trang Danh Mục | 30 | 9,000,000 | Bán, Cho Thuê, Dự Án |
| Responsive & UI | 20 | 6,000,000 | Mobile-first design |
| **Tổng Marketplace Basic** | **300** | **90,000,000** | |

#### 1C. Chi Phí Khác Phase 1

| Hạng mục | Chi phí (VND) | Chi tiết |
|----------|---------------|----------|
| Hạ tầng (3 tháng) | 15,000,000 | VPS, database, Redis |
| Công cụ & Thiết lập | 5,000,000 | Dev tools, CI/CD |
| Dự phòng (10%) | 10,000,000 | Rủi ro |
| **Tổng Phase 1** | **300,000,000** | **~1,000 giờ** |

**Sản Phẩm Bàn Giao Phase 1**:
- ✅ CRM hoạt động cho 100+ agents (basic features)
- ✅ Marketplace basic với 7+ trang (đăng tin, duyệt, tìm kiếm)
- ✅ Hệ thống auth chung (Supabase Auth)
- ✅ Pipeline lead: Marketplace → CRM (basic flow)

---

### Phase 2: CRM Nâng Cao + Marketplace Nâng Cao + Basic Crawling (270 Triệu VND)

**Thời gian**: 3 tháng (Tháng 4-6)
**Giờ công**: ~900 giờ × 300K = 270,000,000 VND

**Mục tiêu**: Hoàn thiện CRM (dừng phát triển sau phase này), nâng cấp Marketplace, bắt đầu crawling

#### 2A. CRM Nâng Cao (~250 giờ) — *Dừng phát triển sau phase này*

| Module | Giờ | Chi phí (VND) | Chi tiết |
|--------|-----|---------------|----------|
| Hoa Hồng Nâng Cao | 50 | 15,000,000 | Multi-level, split, auto-calculate |
| Lead Scoring & Routing | 40 | 12,000,000 | AI scoring, smart routing |
| CRM Affiliate (Cash) | 60 | 18,000,000 | Ví tiền thật, rút tiền, KYC |
| Báo Cáo & Analytics | 40 | 12,000,000 | Báo cáo doanh thu, hiệu suất |
| Bán Data Leads | 30 | 9,000,000 | API bán leads cho đối tác |
| Quản Lý CTV Nâng Cao | 30 | 9,000,000 | Cấp bậc, KPI, đào tạo |
| **Tổng CRM Nâng Cao** | **250** | **75,000,000** | **→ DỪNG CRM sau phase này** |

#### 2B. Marketplace Nâng Cao (~400 giờ)

| Module | Giờ | Chi phí (VND) | Chi tiết |
|--------|-----|---------------|----------|
| AI Research Agent | 50 | 15,000,000 | Tích hợp Perplexica |
| Điểm Tin Cậy (Trust Score) | 40 | 12,000,000 | Thuật toán đa yếu tố |
| AI Tóm Tắt & Lọc Spam | 40 | 12,000,000 | GPT-4, ML-based |
| Chatbot AI | 40 | 12,000,000 | Sidebar, context-aware |
| Hệ Thống Yêu Cầu | 40 | 12,000,000 | Buyer-seller messaging |
| Chuyển Đổi Lead → CRM | 30 | 9,000,000 | Auto-sync pipeline |
| Subscription & Thanh Toán | 50 | 15,000,000 | VNPay, gói FREE/PRO/BIZ |
| Dashboard Người Bán | 30 | 9,000,000 | Analytics, hiệu suất |
| Thư Mục & Hồ Sơ Môi Giới | 30 | 9,000,000 | Profile, đánh giá |
| Đa Ngôn Ngữ | 20 | 6,000,000 | Tiếng Việt/Tiếng Anh |
| Tối Ưu SEO & Performance | 30 | 9,000,000 | Core Web Vitals |
| **Tổng Marketplace Nâng Cao** | **400** | **120,000,000** | |

#### 2C. Basic Web Crawling (~150 giờ)

| Module | Giờ | Chi phí (VND) | Chi tiết |
|--------|-----|---------------|----------|
| Hạ tầng Crawling | 30 | 9,000,000 | Scrapy, Airflow setup |
| Spider BDS.com.vn | 40 | 12,000,000 | 3K+ tin/ngày |
| Spider Chợ Tốt | 40 | 12,000,000 | 3K+ tin/ngày |
| Pipeline Dữ Liệu Basic | 40 | 12,000,000 | Làm sạch, loại trùng |
| **Tổng Basic Crawling** | **150** | **45,000,000** | |

#### 2D. Chi Phí Khác Phase 2

| Hạng mục | Chi phí (VND) | Chi tiết |
|----------|---------------|----------|
| Hạ tầng (3 tháng) | 20,000,000 | VPS nâng cấp, CDN |
| API Services | 18,000,000 | OpenAI, Perplexica, Maps |
| Dự phòng | 12,000,000 | Rủi ro |
| **Tổng Phase 2** | **270,000,000** | **~900 giờ** |

**Sản Phẩm Bàn Giao Phase 2**:
- ✅ CRM hoàn chỉnh cho 1000+ agents (DỪNG phát triển CRM)
- ✅ Marketplace với 5 tính năng AI
- ✅ Hệ thống subscription & thanh toán
- ✅ CRM Affiliate (Cash-based) hoạt động
- ✅ Basic crawling 6K+ tin/ngày
- ✅ Lead pipeline: Marketplace → CRM (tự động)

---

### Phase 3: Marketplace Pro + Crawling Nâng Cao + Affiliate (150 Triệu VND)

**Thời gian**: 4 tháng (Tháng 3-6, song song với Phase 1-2)
**Giờ công**: ~500 giờ × 300K = 150,000,000 VND

**Mục tiêu**: Dừng CRM, tập trung Marketplace Pro + Crawling nâng cao + Dual Affiliate

#### 3A. Marketplace Pro (~200 giờ)

| Module | Giờ | Chi phí (VND) | Chi tiết |
|--------|-----|---------------|----------|
| Marketplace Affiliate (Credit) | 60 | 18,000,000 | Ví credit, referral link |
| Quảng Cáo & Featured Listings | 40 | 12,000,000 | Banner ads, tin nổi bật |
| Tin Tức & Content | 30 | 9,000,000 | Tổng hợp tin tức BĐS |
| Thông Tin Thị Trường | 40 | 12,000,000 | Biểu đồ giá, xu hướng |
| Tối Ưu UX & Conversion | 30 | 9,000,000 | A/B testing, funnel |
| **Tổng Marketplace Pro** | **200** | **60,000,000** | |

#### 3B. Crawling Nâng Cao (~200 giờ)

| Module | Giờ | Chi phí (VND) | Chi tiết |
|--------|-----|---------------|----------|
| Chống Phát Hiện | 40 | 12,000,000 | Proxy rotation, CAPTCHA |
| Tổng Hợp Tin Tức | 30 | 9,000,000 | RSS, news aggregation |
| AI Dự Đoán Giá | 50 | 15,000,000 | RandomForest, 80%+ accuracy |
| AI Phát Hiện Gian Lận | 40 | 12,000,000 | Anomaly detection, 90%+ |
| API Endpoints | 20 | 6,000,000 | Market insights, verify |
| Dashboard Giám Sát | 20 | 6,000,000 | Success rate, data quality |
| **Tổng Crawling Nâng Cao** | **200** | **60,000,000** | |

#### 3C. Chi Phí Khác Phase 3

| Hạng mục | Chi phí (VND) | Chi tiết |
|----------|---------------|----------|
| Hạ tầng Crawling (4 tháng) | 24,000,000 | Proxy, CAPTCHA, AWS |
| Dự phòng | 6,000,000 | Rủi ro |
| **Tổng Phase 3** | **150,000,000** | **~500 giờ** |

**Sản Phẩm Bàn Giao Phase 3**:
- ✅ Marketplace Pro với quảng cáo, thông tin thị trường
- ✅ Marketplace Affiliate (Credit-based) hoạt động
- ✅ Crawling nâng cao 10K+ tin/ngày
- ✅ AI dự đoán giá & phát hiện gian lận
- ✅ Dashboard giám sát crawling

---

## 2. Tổng Hợp Chi Phí Dự Án

### Chi Phí Phát Triển Năm 1 (6 tháng)

| Phase | Giờ công | Nhân sự (300K/h) | Hạ tầng + API | Dự phòng | Tổng (VND) |
|-------|----------|-------------------|---------------|----------|------------|
| **Phase 1** (CRM Basic + MP Basic) | 1,000h | 270,000,000 | 20,000,000 | 10,000,000 | 300,000,000 |
| **Phase 2** (CRM Pro + MP Pro + Crawl) | 900h | 240,000,000 | 18,000,000 | 12,000,000 | 270,000,000 |
| **Phase 3** (MP Pro + Crawl Pro + Affiliate) | 500h | 120,000,000 | 24,000,000 | 6,000,000 | 150,000,000 |
| **TỔNG NĂM 1** | **2,400h** | **630,000,000** | **62,000,000** | **28,000,000** | **720,000,000** |

### Chi Phí Vận Hành Năm 2+ (~250 Triệu VND/năm)

| Hạng mục | Hàng tháng (VND) | Hàng năm (VND) | Chi tiết |
|----------|------------------|----------------|----------|
| **Bảo trì phần mềm (10%)** | 6,000,000 | 72,000,000 | Bug fix, cập nhật, tối ưu |
| **Server & Hạ tầng** | 9,000,000 | 108,000,000 | VPS, database, Redis, CDN |
| **OpenAI API** | 3,000,000 | 36,000,000 | Tính năng AI |
| **Perplexica API** | 1,500,000 | 18,000,000 | Agent nghiên cứu |
| **Google Maps API** | 500,000 | 6,000,000 | Dịch vụ vị trí |
| **Proxy & Crawling** | 500,000 | 6,000,000 | Duy trì hệ thống crawling |
| **Dự phòng** | 333,000 | 4,000,000 | Dự trữ |
| **TỔNG VẬN HÀNH** | **~20,833,000** | **~250,000,000** | |

### Chi Phí Phát Triển Năm 2, 3

> ⚠️ **Chưa tính được** — Chi phí phát triển thêm cho năm 2 và năm 3 sẽ được đánh giá sau khi hoàn thành năm 1, tùy thuộc vào:
> - Nhu cầu mở rộng tính năng mới
> - Phát triển ứng dụng mobile (nếu có)
> - Scale hệ thống theo lượng user
> - Yêu cầu từ thị trường và nhà đầu tư

---

## 3. Cơ Cấu Đội Ngũ & Phân Bổ

### Đơn Giá Quy Chuẩn: **300,000 VND/giờ**

> Tất cả chi phí nhân sự được quy ra giờ công với đơn giá thống nhất 300K/giờ, bao gồm: lương, bảo hiểm, công cụ, overhead.

### Phân Bổ Giờ Công Theo Phase

| Vai trò | Yêu cầu | Phase 1 (giờ) | Phase 2 (giờ) | Phase 3 (giờ) | Tổng (giờ) |
|---------|---------|---------------|---------------|---------------|------------|
| **Frontend Dev** | Mid-Level, 3-5 năm | 400 | 350 | 100 | 850 |
| **Backend Dev** | Mid-Level, 3-5 năm | 450 | 350 | 100 | 900 |
| **Python Dev** | Mid-Level, 3-5 năm | 0 | 150 | 250 | 400 |
| **QA** | Junior, 1-2 năm | 150 | 50 | 50 | 250 |
| **TỔNG** | | **1,000** | **900** | **500** | **2,400** |
| **Chi phí (×300K)** | | **300,000,000** | **270,000,000** | **150,000,000** | **720,000,000** |

### Yêu Cầu Tuyển Dụng

**Frontend Developer (Mid-Level)**:
- 3-5 năm kinh nghiệm React/Next.js
- Thành thạo TypeScript
- Kiến thức SSR/SEO
- TailwindCSS, Emotion styling

**Backend Developer (Mid-Level)**:
- 3-5 năm kinh nghiệm Node.js/NestJS
- PostgreSQL, Drizzle ORM
- Thiết kế GraphQL, REST API
- Redis, BullMQ, tích hợp AI

**Python Developer (Mid-Level)**:
- 3-5 năm kinh nghiệm Python
- Scrapy, BeautifulSoup, Playwright
- Apache Airflow, xử lý dữ liệu
- Cơ bản ML/AI (scikit-learn)

**QA Tester (Junior)**:
- 1-2 năm kinh nghiệm kiểm thử
- Kiểm thử thủ công & tự động
- Playwright/Cypress

---

## 4. Chi Tiết Chi Phí Hạ Tầng

### Hạ Tầng Phase 1 (3 tháng)

| Dịch vụ | Hàng tháng (VND) | 3 tháng (VND) | Chi tiết |
|---------|------------------|----------------|----------|
| VPS Hosting | 1,500,000 | 4,500,000 | VPS tự quản lý |
| Database | 0 | 0 | PostgreSQL tự host |
| Redis | 0 | 0 | Redis tự host |
| CDN | 500,000 | 1,500,000 | CloudFlare free tier |
| Dịch vụ Email | 0 | 0 | SendGrid free tier |
| Dịch vụ SMS | 1,000,000 | 3,000,000 | Sử dụng tối thiểu |
| Giám sát | 0 | 0 | Grafana tự host |
| Domain & SSL | 100,000 | 300,000 | Domain giá rẻ |
| **TỔNG** | **3,100,000** | **9,300,000** | |

### Hạ Tầng Phase 2 (3 tháng)

| Dịch vụ | Hàng tháng (VND) | 3 tháng (VND) | Chi tiết |
|---------|------------------|----------------|----------|
| VPS Hosting | 2,000,000 | 6,000,000 | Nâng cấp cho traffic |
| OpenAI API | 3,000,000 | 9,000,000 | GPT-4 cho tính năng AI |
| Perplexica API | 2,000,000 | 6,000,000 | Agent nghiên cứu |
| CDN | 500,000 | 1,500,000 | CloudFlare |
| Google Maps | 1,000,000 | 3,000,000 | Dịch vụ vị trí |
| **TỔNG** | **8,500,000** | **25,500,000** | |

### Hạ Tầng Phase 3 - Crawling (4 tháng)

| Dịch vụ | Hàng tháng (VND) | 4 tháng (VND) | Chi tiết |
|---------|------------------|----------------|----------|
| Dịch vụ Proxy | 2,000,000 | 8,000,000 | Proxy xoay vòng |
| CAPTCHA Solver | 750,000 | 3,000,000 | API 2Captcha |
| AWS EC2 (Airflow) | 1,200,000 | 4,800,000 | Instance t3.small |
| AWS EC2 (Workers) | 1,200,000 | 4,800,000 | 2x t3.micro |
| Lưu trữ (S3) | 750,000 | 3,000,000 | Lưu dữ liệu thô |
| **TỔNG** | **5,900,000** | **23,600,000** | |

---

## 5. Lộ Trình & Các Mốc Quan Trọng

### Tháng 1: Nền Tảng CRM + Marketplace Basic
- Tuần 1-2: Setup dự án, hạ tầng, auth, RBAC + Setup Next.js SSR
- Tuần 3-4: CRM CRUD (BĐS, giao dịch) + Marketplace trang chủ, duyệt

**Mốc 1**: Khởi động dự án (thanh toán 80 triệu VND)

### Tháng 2: CRM Dashboard + Marketplace Đăng Tin
- Tuần 5-6: Dashboard kinh doanh, hoa hồng basic + Marketplace đăng tin, chi tiết
- Tuần 7-8: Phân phối lead, background jobs + Marketplace bộ lọc, tìm kiếm

**Mốc 2**: CRM + Marketplace basic hoạt động (thanh toán 100 triệu VND)

### Tháng 3: Hoàn Thiện Phase 1 + Bắt Đầu Phase 3 (Crawling)
- Tuần 9-10: CRM admin tools, kiểm thử + Marketplace danh mục, responsive
- Tuần 11-12: Phase 1 production ready + Crawling setup bắt đầu

**Mốc 3**: Phase 1 hoàn thành (thanh toán 100 triệu VND)

### Tháng 4: CRM Nâng Cao + Marketplace AI + Crawling
- Tuần 13-14: CRM hoa hồng nâng cao, CTV + AI Research Agent, Trust Score
- Tuần 15-16: CRM Affiliate (Cash) + AI Chatbot, Spam Filter + Spider BDS.com.vn

**Mốc 4**: CRM Pro + AI features (thanh toán 120 triệu VND)

### Tháng 5: CRM Dừng + Marketplace Pro + Crawling Nâng Cao
- Tuần 17-18: CRM bán data leads (DỪNG CRM) + Subscription, thanh toán
- Tuần 19-20: Marketplace Affiliate (Credit) + Spider Chợ Tốt + AI dự đoán giá

**Mốc 5**: CRM hoàn chỉnh + Marketplace Pro (thanh toán 120 triệu VND)

### Tháng 6: Ra Mắt Production
- Tuần 21-22: Quảng cáo, featured listings + Crawling nâng cao, chống phát hiện
- Tuần 23-24: Tối ưu, kiểm thử, production launch

**Mốc 6**: Production launch (thanh toán 120 triệu VND)

**Thanh toán cuối (Mốc 7)**: 80 triệu VND sau 30 ngày ổn định

---

## 6. Lịch Thanh Toán

| Mốc | Sản phẩm bàn giao | Thời gian | Số tiền (VND) | Tích lũy |
|-----|-------------------|-----------|---------------|----------|
| **M1: Khởi động** | Setup dự án, hạ tầng | Tuần 1 | 80,000,000 | 80 triệu |
| **M2: CRM + MP Basic** | CRM basic + Marketplace basic | Tuần 8 | 100,000,000 | 180 triệu |
| **M3: Phase 1 Done** | Phase 1 production ready | Tuần 12 | 100,000,000 | 280 triệu |
| **M4: CRM Pro + AI** | CRM nâng cao + AI features | Tuần 16 | 120,000,000 | 400 triệu |
| **M5: MP Pro + Crawl** | Marketplace Pro + Crawling | Tuần 20 | 120,000,000 | 520 triệu |
| **M6: Launch** | Production launch | Tuần 24 | 120,000,000 | 640 triệu |
| **M7: Ổn định** | 30 ngày sau ra mắt | Tuần 28 | 80,000,000 | 720 triệu |
| **TỔNG** | | **6 tháng** | **720,000,000** | |

---

## 7. Hệ Thống Affiliate Kép (Dual Affiliate System)

### Tổng Quan

PropConnect sử dụng **2 hệ thống affiliate khác nhau** cho Marketplace và CRM, phục vụ mục đích kinh doanh khác nhau:

```
┌─────────────────────────────────────────────────────────────┐
│              DUAL AFFILIATE SYSTEM                          │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │  MARKETPLACE        │    │  CRM                 │        │
│  │  AFFILIATE          │    │  AFFILIATE           │        │
│  │                     │    │                      │        │
│  │  💳 Credit-based    │    │  💰 Cash-based       │        │
│  │  • Chia sẻ link     │    │  • Hoa hồng BĐS     │        │
│  │  • Kéo member mới   │    │  • CTV bán hàng      │        │
│  │  • Nhận credit      │    │  • Nhận tiền thật    │        │
│  │  • KHÔNG rút tiền   │    │  • RÚT TIỀN ĐƯỢC    │        │
│  │                     │    │                      │        │
│  │  Dùng credit cho:   │    │  Tiền dùng cho:      │        │
│  │  • Đăng tin         │    │  • Rút về tài khoản  │        │
│  │  • Mua quảng cáo    │    │  • Tái đầu tư        │        │
│  │  • Dùng AI services │    │                      │        │
│  │  • Mua báo cáo      │    │                      │        │
│  │  • Nâng cấp gói     │    │                      │        │
│  └─────────────────────┘    └─────────────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │  UNIFIED WALLET (Best Practice)                  │       │
│  │  1 ví chung, 2 loại số dư:                      │       │
│  │  • credit_balance (non-withdrawable)             │       │
│  │  • cash_balance (withdrawable)                   │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### So Sánh Chi Tiết

| Tiêu chí | Marketplace Affiliate | CRM Affiliate |
|----------|----------------------|---------------|
| **Loại tiền** | Credit (ảo) | Cash (thật) |
| **Rút tiền** | ❌ Không | ✅ Có (KYC required) |
| **Cách kiếm** | Chia sẻ link, kéo member | Bán BĐS, giới thiệu deal |
| **Sử dụng** | Đăng tin, quảng cáo, AI, báo cáo | Rút tiền, tái đầu tư |
| **Mục đích** | Tăng trưởng user base | Tối ưu doanh thu |
| **Đối tượng** | Tất cả user marketplace | CTV, agents trong CRM |
| **Hết hạn** | 12 tháng không hoạt động | Không hết hạn |

### Phân Tích Kỹ Thuật: Unified Wallet (Best Practice)

**Khuyến nghị: 1 hệ thống ví chung với 2 loại balance**

```
Wallet {
  user_id: UUID
  credit_balance: Decimal  // Non-withdrawable (Marketplace)
  cash_balance: Decimal    // Withdrawable (CRM)
  total_balance: computed  // credit + cash

  transactions: [
    { type: 'credit_earn', amount, source: 'referral', ... }
    { type: 'credit_spend', amount, target: 'listing_fee', ... }
    { type: 'cash_earn', amount, source: 'commission', ... }
    { type: 'cash_withdraw', amount, bank_account, ... }
  ]
}
```

**Ưu điểm Unified Wallet**:
1. **Single UX**: User chỉ cần 1 nơi quản lý tài chính
2. **Dễ audit**: 1 bảng transaction, dễ báo cáo
3. **Mở rộng**: Có thể thêm loại balance mới (bonus, promo...)
4. **Future-proof**: Có thể cho phép convert credit → cash khi đạt threshold
5. **Giảm complexity**: 1 codebase wallet thay vì 2

**Nhược điểm**:
1. Business logic phức tạp hơn (phân biệt 2 loại khi spend/withdraw)
2. Cần validation chặt chẽ (không cho rút credit)

**Kết luận**: Unified Wallet là best practice, tiết kiệm ~30% effort so với 2 hệ thống riêng.

---

## 8. Phân Tích ROI

### Dự Báo Doanh Thu & Chi Phí (3 Năm)

**Giả định**:
- Ra mắt Tháng 7 (sau 6 tháng phát triển)
- Năm 1: 6 tháng doanh thu (Tháng 7-12)
- Năm 2+: Chi phí vận hành ~250M/năm + chi phí phát triển thêm (chưa tính)

| Chỉ số | Năm 1 (6 tháng DT) | Năm 2 | Năm 3 |
|--------|---------------------|-------|-------|
| **Doanh thu** | 1,200,000,000 | 5,500,000,000 | 15,000,000,000 |
| **Chi phí phát triển** | 720,000,000 | *Chưa tính được* | *Chưa tính được* |
| **Chi phí vận hành** | 0 | ~250,000,000 | ~350,000,000 |
| **Lợi nhuận (trước CP PT thêm)** | **+480,000,000** | **Tùy thuộc CP PT** | **Tùy thuộc CP PT** |

> ⚠️ **Ghi chú**: Chi phí phát triển năm 2 và năm 3 chưa tính được tại thời điểm này. Sẽ được đánh giá sau khi hoàn thành năm 1, dựa trên nhu cầu mở rộng (mobile app, tính năng mới, scale...).

### Chi Tiết Doanh Thu Năm 1 (6 tháng sau launch)

**Từ CRM** (nguồn thu chính):

| Nguồn | Hàng tháng (VND) | 6 tháng (VND) | Ghi chú |
|-------|------------------|---------------|---------|
| **CRM Commission** | 67,000,000 | 400,000,000 | 2-3% mỗi deal qua hệ thống |
| **Bán Data Leads** | 25,000,000 | 150,000,000 | Leads cho đối tác, khách hàng |
| **CTV Network Fee** | 17,000,000 | 100,000,000 | Phí quản lý CTV |
| **Tổng CRM** | **109,000,000** | **650,000,000** | **54% tổng DT** |

**Từ Marketplace**:

| Nguồn | Hàng tháng (VND) | 6 tháng (VND) | Ghi chú |
|-------|------------------|---------------|---------|
| **Subscription** | 33,000,000 | 200,000,000 | FREE/PRO/ENTERPRISE |
| **Featured Listings** | 17,000,000 | 100,000,000 | Tin nổi bật, quảng cáo |
| **Advertising** | 25,000,000 | 150,000,000 | Banner ads, sponsored |
| **AI Services** | 17,000,000 | 100,000,000 | Báo cáo, phân tích premium |
| **Tổng Marketplace** | **92,000,000** | **550,000,000** | **46% tổng DT** |

| **TỔNG DOANH THU** | **~200,000,000** | **1,200,000,000** | |

### Phân Tích Hòa Vốn

- **Tổng Đầu Tư Năm 1**: 720,000,000 VND
- **Doanh Thu Hàng Tháng (ổn định)**: ~200,000,000 VND
- **Hòa vốn**: ~5 tháng sau khi ra mắt (Tháng 11 tổng cộng)
- **ROI Năm 1**: +67% (lãi 480M trên vốn 720M)
- **Chi phí vận hành Năm 2+**: ~250M/năm (bảo trì 10% + server + API)

---

## 9. Đánh Giá & Giảm Thiểu Rủi Ro

### Rủi Ro Kỹ Thuật

**Rủi ro 1: Vấn đề Hiệu suất SSR**
- Tác động: Cao | Xác suất: Trung bình
- Giảm thiểu: Next.js 16 Turbopack, Redis caching, CDN, kiểm thử tải

**Rủi ro 2: Chi Phí API AI Vượt Ngân Sách**
- Tác động: Trung bình | Xác suất: Trung bình
- Giảm thiểu: Giới hạn API, cache phản hồi, GPT-3.5 cho tính năng phụ

**Rủi ro 3: Thu Thập Web Bị Chặn**
- Tác động: Trung bình | Xác suất: Cao
- Giảm thiểu: Chống phát hiện, proxy rotation, tôn trọng robots.txt

**Rủi ro 4: Sẵn Sàng Đội Ngũ**
- Tác động: Cao | Xác suất: Thấp
- Giảm thiểu: Tuyển 2 tuần trước, ứng viên dự phòng, tài liệu hóa

### Rủi Ro Kinh Doanh

**Rủi ro 5: Chấp Nhận Người Dùng Chậm**
- Tác động: Cao | Xác suất: Trung bình
- Giảm thiểu: CRM nội bộ trước (user đảm bảo), Marketplace Affiliate kéo user

**Rủi ro 6: Cạnh Tranh với BDS.com.vn & Chợ Tốt**
- Tác động: Trung bình | Xác suất: Cao
- Giảm thiểu: Phí rẻ hơn, AI tốt hơn, UX tốt hơn, CRM synergy

---

## 10. Chỉ Số Thành Công

### Phase 1: CRM Basic + Marketplace Basic

| Chỉ số | Mục tiêu | Thời gian |
|--------|----------|-----------|
| **Thời gian Hoạt động** | 99%+ | Liên tục |
| **CRM Agents Hoạt động** | 100+ | Tháng 3 |
| **BĐS Đã Đăng (CRM)** | 500+ | Tháng 3 |
| **Marketplace Tin Đăng** | 200+ | Tháng 3 |
| **Phân phối Lead** | < 5 phút | Tháng 3 |

### Phase 2: CRM Pro + Marketplace Pro + Crawling

| Chỉ số | Mục tiêu | Thời gian |
|--------|----------|-----------|
| **CRM Agents** | 500+ | Tháng 6 |
| **Marketplace Users** | 1,000+ | Tháng 8 |
| **Độ chính xác Trust Score** | 85%+ | Tháng 6 |
| **AI Response Time** | < 3s | Tháng 6 |
| **Spam Detection** | 95%+ | Tháng 6 |
| **Crawling/ngày** | 6,000+ | Tháng 6 |

### Phase 3: Marketplace Pro + Crawling Nâng Cao

| Chỉ số | Mục tiêu | Thời gian |
|--------|----------|-----------|
| **Crawling/ngày** | 10,000+ | Tháng 6 |
| **Dự đoán Giá** | 80%+ accuracy | Tháng 6 |
| **Phát hiện Gian lận** | 90%+ accuracy | Tháng 6 |
| **Affiliate Users** | 500+ | Tháng 8 |
| **Tải Trang** | < 2s | Tháng 6 |

---

## 11. Những Gì Bạn Nhận Được (Sản Phẩm Bàn Giao)

### Phase 1: CRM Basic + Marketplace Basic (300 Triệu VND)

**CRM Basic**:
- ✅ Quản lý Người dùng (100+ agents, RBAC, phân quyền)
- ✅ Kho Bất Động Sản (CRUD, đặt chỗ, theo dõi trạng thái)
- ✅ Quản lý Khách Hàng (CRUD, timeline, bảo mật dữ liệu)
- ✅ Quản lý Giao dịch (pipeline, theo dõi thanh toán)
- ✅ Dashboard Kinh doanh (KPI, bảng xếp hạng)
- ✅ Hoa hồng Basic (tính toán, phê duyệt)
- ✅ Phân phối Lead Basic (tự động, cân bằng tải)
- ✅ Background Jobs (BullMQ, email, cron)
- ✅ Admin Tools (quản lý user, cài đặt)

**Marketplace Basic**:
- ✅ Trang Chủ (hero, tìm kiếm, danh mục)
- ✅ Trang Duyệt (lưới tin, bộ lọc, sắp xếp)
- ✅ Trang Chi Tiết (slider ảnh, bản đồ)
- ✅ Đăng Tin Basic (CRUD, upload ảnh)
- ✅ Auth Công Khai (đăng ký/đăng nhập)
- ✅ Trang Danh Mục (Bán, Cho Thuê, Dự Án)

**Stack Công Nghệ**:
- CRM Frontend: React 18, Recoil, Emotion, TypeScript
- Marketplace Frontend: Next.js 16, SSR, SEO
- Backend: NestJS 11, Drizzle ORM, PostgreSQL 15
- Queue: BullMQ, Redis
- Auth & Storage: Supabase

### Phase 2: CRM Pro + Marketplace Pro + Basic Crawling (270 Triệu VND)

**CRM Nâng Cao** (DỪNG sau phase này):
- ✅ Hoa hồng Nâng Cao (multi-level, split, auto-calculate)
- ✅ Lead Scoring & Smart Routing
- ✅ CRM Affiliate (Cash-based, ví tiền thật, rút tiền)
- ✅ Bán Data Leads (API cho đối tác)
- ✅ Quản lý CTV Nâng Cao (cấp bậc, KPI)
- ✅ Báo cáo & Analytics nâng cao

**Marketplace Nâng Cao**:
- ✅ 5 Tính năng AI (Research, Trust Score, Summary, Spam, Chatbot)
- ✅ Hệ thống Yêu cầu (buyer-seller messaging)
- ✅ Chuyển đổi Lead → CRM (auto-sync)
- ✅ Subscription & Thanh toán (VNPay)
- ✅ Thư Mục & Hồ Sơ Môi Giới
- ✅ Dashboard Người Bán
- ✅ Đa ngôn ngữ (Tiếng Việt/Tiếng Anh)

**Basic Crawling**:
- ✅ Spider BDS.com.vn (3K+ tin/ngày)
- ✅ Spider Chợ Tốt (3K+ tin/ngày)
- ✅ Pipeline Dữ liệu (làm sạch, loại trùng)

### Phase 3: Marketplace Pro + Crawling Nâng Cao + Affiliate (150 Triệu VND)

**Marketplace Pro**:
- ✅ Marketplace Affiliate (Credit-based, ví credit, referral)
- ✅ Quảng cáo & Featured Listings
- ✅ Tin Tức & Content BĐS
- ✅ Thông tin Thị trường (biểu đồ, xu hướng)

**Crawling Nâng Cao**:
- ✅ Chống Phát hiện (proxy rotation, CAPTCHA)
- ✅ AI Dự đoán Giá (80%+ accuracy)
- ✅ AI Phát hiện Gian lận (90%+ accuracy)
- ✅ API Endpoints (market insights, verify)
- ✅ Dashboard Giám sát

**Dual Affiliate System**:
- ✅ Unified Wallet (credit_balance + cash_balance)
- ✅ Marketplace Affiliate: credit-based, dùng trên nền tảng
- ✅ CRM Affiliate: cash-based, rút tiền thật

---

## 12. So Sánh Chi Phí Theo Phase

### Phân Bổ Giờ Công & Chi Phí

| Phase | Giờ công | Chi phí (×300K/h) | Hạ tầng + API | Dự phòng | Tổng |
|-------|----------|-------------------|---------------|----------|------|
| **Phase 1**: CRM Basic + MP Basic | 1,000h | 270M | 20M | 10M | **300M** |
| **Phase 2**: CRM Pro + MP Pro + Crawl Basic | 900h | 240M | 18M | 12M | **270M** |
| **Phase 3**: MP Pro + Crawl Pro + Affiliate | 500h | 120M | 24M | 6M | **150M** |
| **TỔNG** | **2,400h** | **630M** | **62M** | **28M** | **720M** |

### So Sánh CRM vs Marketplace (2 Dự Án Tương Hỗ)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PROPCONNECT ECOSYSTEM                             │
│                                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐          │
│  │     MARKETPLACE      │ ──────► │        CRM           │          │
│  │  (Thu Leads & Data)  │  Leads  │  (Tối Ưu Lợi Nhuận) │          │
│  │                      │ ◄────── │                      │          │
│  │  • Đăng tin BĐS      │  Data   │  • Quản lý agents    │          │
│  │  • Tìm kiếm AI       │         │  • Hoa hồng nâng cao │          │
│  │  • Trust Score        │         │  • CTV network       │          │
│  │  • Crawling data      │         │  • Bán data leads    │          │
│  │  • Affiliate (Credit) │         │  • Affiliate (Cash)  │          │
│  │                      │         │                      │          │
│  │  Mục tiêu:           │         │  Mục tiêu:           │          │
│  │  → Thu leads          │         │  → Tối ưu doanh thu  │          │
│  │  → Dữ liệu thị trường│         │  → Phát triển CTV    │          │
│  │  → Điều phối thị trường│        │  → Bán data leads    │          │
│  │  → Phí rẻ hơn đối thủ│         │  → Commission deals  │          │
│  └──────────────────────┘         └──────────────────────┘          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                    WEB CRAWLING                           │       │
│  │  Cung cấp dữ liệu cho cả Marketplace & CRM              │       │
│  │  • BDS.com.vn spider  • Chợ Tốt spider                   │       │
│  │  • AI dự đoán giá     • Phát hiện gian lận               │       │
│  └──────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
```

### So Sánh Với Đối Thủ

| Tiêu chí | PropConnect | BDS.com.vn | Chợ Tốt Nhà Đất |
|----------|-------------|------------|------------------|
| **Phí đăng tin** | Rẻ hơn 30-50% | Cao | Trung bình |
| **AI Features** | ✅ 5 tính năng | ❌ Không | ❌ Không |
| **Trust Score** | ✅ Tự động | ❌ Không | ❌ Không |
| **CRM tích hợp** | ✅ Có | ❌ Không | ❌ Không |
| **Crawling Data** | ✅ Real-time | ❌ Không | ❌ Không |
| **Affiliate System** | ✅ Dual (Credit + Cash) | ❌ Không | ❌ Không |
| **Dự đoán giá AI** | ✅ 80%+ accuracy | ❌ Không | ❌ Không |
| **CTV Network** | ✅ Quản lý đầy đủ | ❌ Không | ❌ Không |

**Lợi thế cạnh tranh cốt lõi**: PropConnect không chỉ là trang đăng tin — mà là **hệ sinh thái** kết hợp Marketplace (thu leads) + CRM (tối ưu lợi nhuận) + AI (tăng chất lượng) + Crawling (dữ liệu thị trường).

---

## 13. Khuyến Nghị

### Phê Duyệt Ngân Sách

| Hạng mục | Số tiền | Ghi chú |
|----------|---------|---------|
| **Chi phí phát triển Năm 1** | **720,000,000 VND** | 2,400 giờ × 300K/h + hạ tầng |
| **Chi phí vận hành Năm 2+** | **~250,000,000 VND/năm** | Bảo trì 10% + server + API |
| **Chi phí phát triển Năm 2, 3** | **Chưa tính được** | Đánh giá sau khi hoàn thành Năm 1 |

### Điều Khoản Thanh Toán

| Đợt | Mốc | Số tiền | Tích lũy |
|------|------|---------|----------|
| M1 | Khởi động dự án | 80 triệu | 80 triệu |
| M2 | CRM + Marketplace Basic hoạt động | 100 triệu | 180 triệu |
| M3 | Phase 1 production ready | 100 triệu | 280 triệu |
| M4 | CRM Pro + AI features | 120 triệu | 400 triệu |
| M5 | Marketplace Pro + Crawling | 120 triệu | 520 triệu |
| M6 | Production launch | 120 triệu | 640 triệu |
| M7 | 30 ngày ổn định | 80 triệu | **720 triệu** |

### Yếu Tố Thành Công

1. **Tuyển đội ngũ có kinh nghiệm**: Dev mid-level với thành tích đã chứng minh
2. **Phân biệt rõ CRM vs Marketplace**: 2 dự án khác nhau, vai trò tương hỗ
3. **Đánh giá thường xuyên**: Họp tiến độ hàng tuần, review code
4. **Phase 1 là nền tảng**: CRM + Marketplace basic phải vững trước khi nâng cao
5. **Giám sát chi phí**: Theo dõi giờ công, API usage, hạ tầng
6. **Phản hồi người dùng**: Iterate dựa trên feedback thực tế
7. **Affiliate sớm**: Marketplace Affiliate giúp tăng trưởng user nhanh

### Các Bước Tiếp Theo

1. **Phê duyệt ngân sách** (720 triệu VND)
2. **Tuyển đội ngũ** (4 người, bắt đầu 2 tuần trước khởi động)
3. **Thiết lập hạ tầng** (VPS, database, công cụ dev)
4. **Họp khởi động** (thống nhất mục tiêu, lộ trình, deliverables)
5. **Bắt đầu Phase 1** (CRM Basic + Marketplace Basic song song)

---

## 14. Kết Luận

### Tổng Quan Dự Án

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên dự án** | PropConnect — Nền Tảng Đăng Tin BĐS AI + CRM |
| **Tổng chi phí phát triển** | 720,000,000 VND (6 tháng, 2,400 giờ × 300K/h) |
| **Chi phí vận hành Năm 2+** | ~250,000,000 VND/năm |
| **Thời gian phát triển** | 6 tháng (3 phases) |
| **Đội ngũ** | 4 người (Frontend, Backend, Python Dev, QA) |
| **Hòa vốn** | ~5 tháng sau launch (Tháng 11 tổng cộng) |
| **ROI Năm 1** | +67% (lãi 480M trên vốn 720M) |

### Giá Trị Cốt Lõi

- ✅ **2 dự án tương hỗ**: Marketplace thu leads + CRM tối ưu lợi nhuận
- ✅ **Cạnh tranh trực tiếp**: BDS.com.vn & Chợ Tốt Nhà Đất (phí rẻ hơn, chất lượng tốt hơn)
- ✅ **5 tính năng AI**: Research, Trust Score, Summary, Spam Filter, Chatbot
- ✅ **Crawling Automation**: Dữ liệu thị trường real-time, dự đoán giá
- ✅ **Dual Affiliate**: Credit (Marketplace) + Cash (CRM) — tăng trưởng user & doanh thu
- ✅ **Sẵn sàng mở rộng**: Kiến trúc hỗ trợ mobile app, scale toàn quốc
- ✅ **Chi phí vận hành thấp**: Năm 2+ chỉ ~250M/năm

### Phạm Vi Tài Liệu

> ⚠️ Tài liệu này chỉ bao gồm **nền tảng web** (Năm 1). Chi phí phát triển thêm cho Năm 2, 3 (mobile app, tính năng mới, scale) sẽ được đánh giá riêng sau khi hoàn thành Năm 1.

---

**Trạng Thái Tài Liệu**: Sẵn sàng Đánh giá
**Chuẩn bị bởi**: Đội Phát triển
**Ngày**: 9 tháng 2, 2026
**Phiên bản**: v2.0 (cập nhật Phase structure, Dual Affiliate, giờ công 300K/h)

---

**KẾT THÚC BÁO GIÁ NỀN TẢNG WEB — PROPCONNECT**

