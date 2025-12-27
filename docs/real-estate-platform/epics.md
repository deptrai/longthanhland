## Nền tảng Phân phối Bất động sản - Epic Breakdown

**Tác giả:** Luis (Dev Team) + Mary (Business Analyst)
**Ngày:** 06/12/2025
**Cấp độ dự án:** Enterprise
**Quy mô mục tiêu:** 1000+ người dùng
**Dựa trên:** PRD v1.3 (FINAL)

---

## Tổng quan

Tài liệu này mô tả đầy đủ cấu trúc Epic và Story cho Nền tảng Phân phối Bất động sản, chuyển hóa các yêu cầu trong [PRD v1.3](./prd-v1.3.md) thành các stories có thể triển khai cho đội dev.

## Tóm tắt Epic & Thứ tự thực hiện

### Triển khai theo Phase

**MVP (Phase 1)** - 5 tuần:
- Epic 1: Nền tảng & Khởi tạo hệ thống (Foundation & Setup)
- Epic 2: Quản lý Tồn kho Bất động sản (Property Inventory Management)
- Epic 3: Quản lý Khách hàng & Giao dịch (Customer & Deal Management)
- Epic 4: Công cụ cho Sales Agent (Sales Agent Tools)
- Epic 5: Quản lý Hoa hồng (Commission Management)

**Phase 2** - 2 tuần:
- Epic 6: Phân phối Lead & Tự động hóa (Lead Distribution & Automation)

**Phase 3** - 2 tuần:
- Epic 7: Vận hành & Mở rộng (Operations & Scale)

---

## Cấu trúc Epic (7 Epics, ~38 Stories)

### Epic 1: Nền tảng & Khởi tạo hệ thống 🏗️
**Giá trị:** Thiết lập nền tảng kỹ thuật và validate khả năng của Twenty CRM

**Phạm vi:**
- Kiểm chứng kỹ thuật Twenty CRM (Phase 0 POC)
- Thiết lập cấu trúc project và monorepo
- Xây nền schema database (metadata system của Twenty)
- Thiết lập CI/CD pipeline (Docker + Dokploy)
- Cấu hình xác thực & phân quyền (Authentication & RBAC)

**Số lượng story:** 5 stories
**Phụ thuộc:** Không (epic đầu tiên)
**Kết quả:** Có hạ tầng chạy được, sẵn sàng để build các tính năng phía trên

#### Detailed Stories

##### Story 1.1: Project Initialization 🚀
**As a** Developer
**I want** to clone and setup Twenty CRM v0.52.0
**So that** I have a working development environment

**Acceptance Criteria:**
- ✅ Given a fresh environment, When I run the clone command, Then Twenty CRM v0.52.0 is cloned successfully
- ✅ Given cloned repository, When I run `pnpm install`, Then all dependencies are installed without errors
- ✅ Given dependencies installed, When I check node version, Then Node.js 20.18.0 LTS is confirmed

**Tech Tasks:**
1. Clone Twenty CRM at exact version - Ref: `architecture.md` lines 28-36
   ```bash
   git clone --branch v0.52.0 https://github.com/twentyhq/twenty.git
   ```
2. Install dependencies with pnpm 9.14.2
3. Verify Node.js 20.18.0 LTS installed

**Estimate:** 2 hours
**Priority:** P0 (Blocking)

---

##### Story 1.2: Development Environment Setup 🔧
**As a** Developer
**I want** to configure PostgreSQL and Redis infrastructure
**So that** the application can run locally

**Acceptance Criteria:**
- ✅ Given `.env` configured with database credentials, When I run `docker compose up -d`, Then PostgreSQL 16.4 and Redis 7.4.1 containers start successfully
- ✅ Given infrastructure running, When I run `npx nx database:migrate twenty-server`, Then database schema is created
- ✅ Given all services running, When I access `http://localhost:3000`, Then Twenty API responds with health check
- ✅ Given all services running, When I access `http://localhost:3001`, Then Twenty frontend loads

**Tech Tasks:**
1. Copy `.env.example` to `.env` - Ref: `architecture.md` lines 38-43
2. Configure PostgreSQL connection string:
   ```
   PG_DATABASE_URL=postgres://postgres:postgres@localhost:5432/default
   ```
3. Configure Redis connection:
   ```
   REDIS_URL=redis://localhost:6379
   ```
4. Start Docker containers with `docker compose -f docker-compose.dev.yml up -d`
5. Run database migrations
6. Start backend and frontend servers

**Estimate:** 2 hours
**Priority:** P0 (Blocking)

---

##### Story 1.3: Real Estate Module Structure 📦
**As a** Developer
**I want** to create the real-estate module skeleton
**So that** we have a structured place for all real estate features

**Acceptance Criteria:**
- ✅ Given module file created, When imported in `app.module.ts`, Then no TypeScript compilation errors
- ✅ Given constants defined, Then `REAL_ESTATE_OBJECT_IDS` contains unique UUIDs for each entity
- ✅ Given empty workspace entities created, When server starts, Then Twenty metadata system recognizes new module
- ✅ Given module structure, Then folder matches architecture source tree exactly

**Tech Tasks:**
1. Create module folder structure - Ref: `architecture.md` lines 92-121
   ```
   packages/twenty-server/src/modules/real-estate/
   ├── standard-objects/
   ├── services/
   ├── jobs/
   ├── resolvers/
   ├── constants/
   └── real-estate.module.ts
   ```
2. Create `real-estate.module.ts` with NestJS module decorator
3. Create `constants/real-estate-object-ids.ts` with UUID constants
4. Create `constants/real-estate-field-ids.ts` with field UUID constants
5. Register module in `app.module.ts`
6. Verify server starts without errors

**Estimate:** 4 hours
**Priority:** P0 (Blocking)

---

##### Story 1.4: RBAC & Authentication Configuration 🔐
**As an** Admin
**I want** role-based access control configured
**So that** different user types have appropriate permissions

**Acceptance Criteria:**
- ✅ Given Admin role, When user logs in as Admin, Then full access to all modules is granted
- ✅ Given Sales Agent role, When accessing Commission module, Then view-only access is permitted
- ✅ Given Finance role, When accessing Property module, Then access is denied
- ✅ Given Manager role, When accessing Reports, Then read access is granted
- ✅ Given JWT authentication, When token expires after 7 days, Then user must re-authenticate

**Tech Tasks:**
1. Define roles in Twenty's permission system - Ref: `architecture.md` lines 653-660
   ```
   Admin: Full access all modules
   Sales Agent: Read projects/properties, Reserve, Manage own leads, View own commissions
   Finance: Read/Update commissions (approve/pay), Export CSV
   Manager: Read all, Reports, No edit
   ```
2. Configure JWT token expiry to 7 days
3. Setup automatic token refresh
4. Test each role's permissions

**Estimate:** 4 hours
**Priority:** P1 (High)

---

##### Story 1.5: Deployment Pipeline Setup 🚀
**As a** DevOps Engineer
**I want** Docker and Dokploy configured
**So that** we can deploy to production

**Acceptance Criteria:**
- ✅ Given Dockerfile, When built, Then image size is under 500MB
- ✅ Given Dokploy configuration, When deployed, Then application is accessible via domain
- ✅ Given environment secrets, When deployed, Then secrets are not exposed in container logs
- ✅ Given deployment, When Nginx configured, Then HTTPS works with SSL certificate

**Tech Tasks:**
1. Create/verify Dockerfile for production build
2. Configure Dokploy project - Ref: `architecture.md` lines 697-726
3. Setup Nginx reverse proxy configuration:
   ```
   :443 → twenty-front:3001
   /api → twenty-server:3000
   ```
4. Configure environment variables in Dokploy secrets
5. Setup Docker volumes for PostgreSQL and Redis persistence
6. Test deployment to staging environment

**Estimate:** 4 hours
**Priority:** P1 (High)

---

**Epic 1 Total:** 5 stories, ~16 hours

---

### Epic 2: Quản lý Tồn kho Bất động sản 📦
**Giá trị:** Cho phép theo dõi real-time tồn kho lô đất trên tất cả dự án

**Phạm vi:**
- Module Projects (CRUD + quản lý file gallery)
- Module Properties (CRUD + workflow trạng thái)
- Hệ thống giữ chỗ (reservation) với tự động release sau 24h
- Phòng tránh double-booking (ràng buộc DB + locking giao dịch)
- Dashboard real-time về trạng thái tồn kho

**Số lượng story:** 7 stories
**Phụ thuộc:** Epic 1 (nền tảng phải xong trước)
**Kết quả:** Admin có thể quản lý dự án/lô đất, theo dõi tồn kho theo thời gian thực

---

### Epic 3: Quản lý Khách hàng & Giao dịch 🤝
**Giá trị:** Theo dõi vòng đời khách hàng và pipeline giao dịch từ lead đến chốt deal

**Phạm vi:**
- Module Contact/Customer (CRUD + bảo mật dữ liệu cá nhân)
- Module Deal/Transaction (tự tạo khi khách đặt cọc)
- Workflow đồng bộ trạng thái Property–Deal
- Màn hình pipeline deal (Kanban theo trạng thái)
- Trigger tạo hoa hồng khi Deal ở trạng thái Won

**Số lượng story:** 5 stories
**Phụ thuộc:** Epic 2 (phải có Properties để gắn Deal)
**Kết quả:** Sales agent có thể theo dõi khách hàng và giao dịch end-to-end

---

### Epic 4: Công cụ cho Sales Agent 👨‍💼
**Giá trị:** Trao quyền cho sales với các công cụ tự phục vụ và nhìn thấy hiệu suất cá nhân

**Phạm vi:**
- Mở rộng đối tượng User (các trường dành riêng cho sales)
- Dashboard hiệu suất cho từng sales (personal view)
- Các widget hiệu suất (tổng số deal, tổng hoa hồng, leaderboard)
- Widget "Lô đất tôi đang giữ chỗ" (My Reserved Properties)
- Theo dõi hoa hồng (view-only cho sales)

**Số lượng story:** 6 stories
**Phụ thuộc:** Epic 2 (Properties), Epic 3 (Deals), Epic 5 (Commission)
**Kết quả:** Sales agent tự xem được tồn kho, pipeline của mình, và hoa hồng tương ứng

---

### Epic 5: Quản lý Hoa hồng 💰
**Giá trị:** Tự động hóa tính toán hoa hồng và đơn giản hóa quy trình chi trả

**Phạm vi:**
- Tự động tính hoa hồng (khi Deal chuyển sang trạng thái Won)
- Workflow phê duyệt hoa hồng (Admin review + approve)
- Export batch thanh toán (file CSV cho chuyển khoản hàng loạt)
- Báo cáo hoa hồng (theo sales, theo giai đoạn)
- Giao diện Finance để quản lý trạng thái thanh toán

**Số lượng story:** 5 stories
**Phụ thuộc:** Epic 3 (Deals phải tạo được commission)
**Kết quả:** Bộ phận Kế toán/Finance xử lý hoa hồng chính xác, minh bạch và tiết kiệm thời gian

---

### Epic 6: Phân phối Lead & Tự động hóa 🎯
**Giá trị:** Phân phối lead công bằng và tự động cho sales

**Phạm vi:**
- Mở rộng đối tượng Lead (assignedSales, trường SLA, v.v.)
- Thuật toán auto-assignment (round-robin, có xét sức chứa/capacity)
- Theo dõi SLA (thời gian phản hồi, nhắc nhở follow-up)
- Hệ thống thông báo (Email + tích hợp Zalo nếu khả thi)
- Dashboard phân phối lead (admin có thể override)

**Số lượng story:** 6 stories
**Phụ thuộc:** Epic 4 (User phải có các trường phục vụ tính capacity)
**Kết quả:** Lead được phân phối công bằng, có theo dõi SLA, giảm lead bị bỏ quên

**Lưu ý:** Đây là Phase 2, KHÔNG thuộc MVP.

---

### Epic 7: Vận hành & Mở rộng 📊
**Giá trị:** Tăng trải nghiệm người dùng và đảm bảo hệ thống scale tốt cho 1000+ users

**Phạm vi:**
- Bản đồ lô đất tương tác (interactive plot map) dùng SVG overlay trên masterPlanImage
- Báo cáo & analytics nâng cao (doanh số theo dự án, xu hướng hiệu suất sales)
- Công cụ hỗ trợ vận hành (admin impersonation, system health dashboard)
- Playbook triển khai pilot (rollout cho 200 sales agents)

**Số lượng story:** 4 stories
**Phụ thuộc:** Tất cả các epic trước (tính chất nâng cao/tối ưu)
**Kết quả:** Hệ thống sẵn sàng production cho 1000+ users, rollout pilot được quản lý tốt

**Lưu ý:** Đây là Phase 3, bao gồm phần hỗ trợ Pilot Program.

---

## Vì sao cấu trúc này hợp lý?

### Thứ tự theo Giá trị (Value-Based Sequencing) ✅
- Mỗi epic mang lại **giá trị kinh doanh độc lập**
- Không group theo layer kỹ thuật (không có epic kiểu "Backend" hay "Frontend")
- Đặt tên theo **khả năng/giá trị cho người dùng**, không phải chi tiết implementation

### Triển khai Gia tăng (Incremental Delivery) ✅
- Epic 1 xây nền tảng → các epic sau build chồng lên
- Epic 2–5 = MVP → Đã đủ để vận hành quản lý tồn kho và hoa hồng
- Epic 6 = Phase 2 → Thêm tự động hóa cho lead
- Epic 7 = Phase 3 → Nâng cao UX và khả năng scale

### Phụ thuộc Rõ ràng ✅
- Chuỗi tuyến tính: 1 → 2 → 3 → 4 & 5 (có thể song song) → 6 → 7
- Epic 4 và 5 có thể phát triển song song (overlap ít)
- Không có phụ thuộc ngược (mỗi story chỉ phụ thuộc vào story/epic trước đó)

### Kích thước Story Hợp lý ✅
- Tổng ~38 stories cho 7 epics
- Trung bình 5–6 stories/epic (scope vừa phải)
- Mỗi story đủ nhỏ để 1 dev làm trong 1 phiên tập trung (4–8 tiếng)

### Khớp với Phasing trong PRD ✅
- MVP (Epic 1–5) = PRD Phase 1 (5 tuần)
- Epic 6 = PRD Phase 2 (2 tuần)
- Epic 7 = PRD Phase 3 (2 tuần)
- Pilot program (Epic 7, 1 story riêng) = PRD Section 16.1.5

---

## Epic 8: Public Marketplace (Thị trường Công khai) 🌐

**Giá trị:** Transform internal CRM thành dual-purpose platform, generate unlimited qualified leads từ public marketplace

**Phạm vi:**
- SSR infrastructure cho SEO (Express middleware)
- Public user management (registration, authentication, subscriptions)
- Public listing management (post, approve, browse, search)
- AI-powered features (research, summary, trust score, spam filter)
- Inquiry system & lead conversion workflow
- Monetization (subscriptions, featured listings)
- Analytics & reporting

**Số lượng story:** 38 stories
**Phụ thuộc:** Epic 1-7 (internal CRM foundation)
**Timeline:** 16 weeks (Phase 4)
**Kết quả:** Functional public marketplace generating 500 qualified leads/month

**Assumptions (CONFIRMED):**
- ✅ OpenAI via v98store key (already implemented)
- ✅ Web scraping via Perplexica API
- ✅ VNPay payment integration
- ✅ Redis available for SSR caching

### Sub-Epics:

**Epic 8.1: Foundation & SSR Setup** (6 stories, Week 1-2)
**Epic 8.2: Public User Management** (5 stories, Week 2-3)
**Epic 8.3: Public Listing Management** (6 stories, Week 3-5)
**Epic 8.4: AI Research & Trust System** (5 stories, Week 5-7)
**Epic 8.5: AI Summary & Spam Filter** (4 stories, Week 7-9)
**Epic 8.6: Inquiry & Lead Conversion** (5 stories, Week 9-11)
**Epic 8.7: Monetization & Analytics** (4 stories, Week 12-14)
**Epic 8.8: Advanced Features** (3 stories, Week 15-16)

---

### Epic 8.1: Foundation & SSR Setup (6 stories)

#### Story 8.1.1: Project Setup & Module Structure 🏗️

**As a** developer,
**I want** to set up the Public Marketplace module structure within Twenty CRM,
**So that** we have a clean foundation for implementing all public marketplace features.

**Acceptance Criteria:**
- ✅ Given the Twenty CRM monorepo exists, When I create the public marketplace module structure, Then directories are created: `packages/twenty-server/src/modules/public-marketplace/`, `packages/twenty-front/src/modules/public-marketplace/`, `packages/twenty-front/server/`
- ✅ Given module structure created, When I register the module, Then it's properly registered in Twenty's DI system
- ✅ Given module registered, When I check configuration, Then tsconfig and jest.config are created

**Tech Tasks:**
1. Create backend module directory structure
2. Create frontend components directory
3. Create SSR server directory
4. Register module in `core-modules.module.ts`
5. Create README.md documenting module purpose
6. Setup configuration files

**Prerequisites:** None (first story)
**Estimate:** 4 hours
**Priority:** P0 (Blocking)

**Technical Notes:**
- Follow Twenty's module conventions
- Use `@Module()` decorator for NestJS
- Reference: `/docs/real-estate-platform/architecture.md`

---

#### Story 8.1.2: Express SSR Server Setup 🚀

**As a** developer,
**I want** to set up an Express.js SSR server for public pages,
**So that** search engine bots receive pre-rendered HTML with proper meta tags.

**Acceptance Criteria:**
- ✅ Given project structure set up (Story 8.1.1), When I create Express SSR server, Then server in `packages/twenty-front/server/index.ts` is created
- ✅ Given server created, When I start server, Then it listens on port 3002 (configurable)
- ✅ Given server running, When I access routes, Then basic routing works for `/`, `/listings`, `/listings/:id`
- ✅ Given server running, When I check health, Then `/health` endpoint responds

**Tech Tasks:**
1. Install Express.js 4.18.x
2. Create server entry point
3. Setup basic routing
4. Integrate with Vite build output
5. Configure logging (Winston)
6. Add health check endpoint
7. Setup graceful shutdown

**Prerequisites:** Story 8.1.1
**Estimate:** 6 hours
**Priority:** P0

**Technical Notes:**
- Reference ADR-006 in architecture.md
- Environment variables: `SSR_PORT`, `SSR_ENABLED`
- Use existing Twenty infrastructure

---

#### Story 8.1.3: Bot Detection Middleware 🤖

**As a** developer,
**I want** to implement bot detection middleware,
**So that** we can serve SSR content to bots and CSR to regular users.

**Acceptance Criteria:**
- ✅ Given Express SSR server running (Story 8.1.2), When request comes, Then middleware detects if user-agent is a bot
- ✅ Given bot detected, When middleware processes, Then `req.isBot = true` is set
- ✅ Given regular user, When middleware processes, Then `req.isBot = false` is set
- ✅ Given bot detection, When logging, Then detection results are logged

**Tech Tasks:**
1. Create `server/middleware/bot-detection.ts`
2. Implement regex pattern matching for bots:
   - Googlebot, Bingbot, Slurp, DuckDuckBot
   - Baiduspider, Yandexbot
   - Social bots: facebookexternalhit, Twitterbot, LinkedInBot
3. Add unit tests for detection logic
4. Integrate middleware into Express app

**Prerequisites:** Story 8.1.2
**Estimate:** 4 hours
**Priority:** P0

**Technical Notes:**
- Consider using `isbot` npm package
- Case-insensitive matching
- Reference: frontend-architecture-analysis.md Section 5.2

---

#### Story 8.1.4: SSR Rendering for Public Routes 🎨

**As a** developer,
**I want** to implement SSR rendering for public marketplace routes,
**So that** bots receive fully rendered HTML with content.

**Acceptance Criteria:**
- ✅ Given bot detection working (Story 8.1.3), When bot requests page, Then server uses `react-dom/server.renderToString()` to render
- ✅ Given rendering, When data needed, Then GraphQL API is called before rendering
- ✅ Given HTML rendered, When response sent, Then complete HTML with status 200 returned
- ✅ Given SSR rendering, When measured, Then completes within 500ms (target)
- ✅ Given SSR error, When fallback needed, Then gracefully falls back to CSR

**Tech Tasks:**
1. Create `server/ssr-renderer.ts` module
2. Setup `StaticRouter` from `react-router-dom/server`
3. Implement Apollo Client SSR for data fetching
4. Create `getServerSideProps` pattern for async data
5. Add error boundaries for SSR failures
6. Implement routes: `/`, `/listings`, `/listings/:id`

**Prerequisites:** Story 8.1.3
**Estimate:** 8 hours
**Priority:** P0

**Technical Notes:**
- Critical route: `/listings/:id` (most important for SEO)
- Reference ADR-006 implementation section

---

#### Story 8.1.5: Dynamic Meta Tags Generation 🏷️

**As a** developer,
**I want** to generate dynamic meta tags for each listing page,
**So that** search engines and social media platforms display rich previews.

**Acceptance Criteria:**
- ✅ Given SSR rendering working (Story 8.1.4), When listing page rendered for bot, Then HTML includes: title tag, meta description, OG tags, Twitter Card tags, canonical URL
- ✅ Given meta tags, When generated, Then dynamically based on listing data
- ✅ Given homepage/browse pages, When rendered, Then default meta tags used
- ✅ Given images in meta, When URLs generated, Then absolute URLs used

**Tech Tasks:**
1. Create `server/meta-tags-generator.ts` module
2. Implement `generateListingMetaTags(listing)` function
3. Generate tags:
   - `<title>` with listing title + location
   - `<meta name="description">` (max 160 chars)
   - OG tags: title, description, image, url, type
   - Twitter Card tags
   - Canonical URL
4. Escape special characters
5. Use React Helmet or similar

**Prerequisites:** Story 8.1.4
**Estimate:** 4 hours
**Priority:** P1

**Technical Notes:**
- Reference frontend-architecture-analysis.md Section 5.2
- Template-based generation

---

#### Story 8.1.6: Redis Caching for SSR ⚡

**As a** developer,
**I want** to implement Redis caching for SSR-rendered pages,
**So that** we reduce server load and improve response times.

**Acceptance Criteria:**
- ✅ Given SSR and meta tags working (Story 8.1.5), When bot requests recently rendered page, Then Redis cache checked first
- ✅ Given cache hit, When HTML found, Then cached HTML returned
- ✅ Given cache miss, When HTML not found, Then fresh HTML rendered and cached
- ✅ Given caching, When TTL set, Then 1-hour TTL used
- ✅ Given cache metrics, When monitored, Then hit/miss logged
- ✅ Given cache hit rate, When measured, Then >80% target

**Tech Tasks:**
1. Use existing Redis connection from Twenty CRM
2. Create `server/cache-manager.ts` module
3. Implement cache key pattern: `ssr:${route}:${params}`
4. Implement cache get/set with TTL
5. Add cache invalidation webhook
6. Add metrics to monitoring dashboard
7. Configure `SSR_CACHE_TTL` environment variable

**Prerequisites:** Story 8.1.5
**Estimate:** 6 hours
**Priority:** P1

**Technical Notes:**
- Cache invalidation on listing update critical
- Monitor cache performance

---

### Epic 8.2: Public User Management (5 stories)

#### Story 8.2.1: PublicUser Entity & CRUD 👤

**As a** developer,
**I want** to create the PublicUser entity with CRUD operations,
**So that** we can store and manage public user data.

**Acceptance Criteria:**
- ✅ Given module structure (Epic 8.1), When I create PublicUser entity, Then `PublicUserWorkspaceEntity` created with Twenty's `@WorkspaceEntity` decorator
- ✅ Given entity created, When fields defined, Then includes: email, phone, fullName, userType, verified, subscriptionTier (per PRD 4.8.2)
- ✅ Given entity registered, When GraphQL generated, Then CRUD operations auto-generated
- ✅ Given database, When migration run, Then PublicUser table created
- ✅ Given service, When created, Then `PublicUserService` with TwentyORMGlobalManager exists

**Tech Tasks:**
1. Create `public-user.workspace-entity.ts`
2. Define fields with `@WorkspaceField` decorators:
   - email (EMAIL, unique, required)
   - phone (PHONE, required, verified)
   - fullName (TEXT)
   - userType (SELECT: BUYER, SELLER, BROKER)
   - verified (BOOLEAN, default false)
   - subscriptionTier (SELECT: FREE, BASIC, PRO, ENTERPRISE)
   - Computed: totalListings, activeListings, responseRate
3. Create database migration
4. Create `PublicUserService`
5. Register in `RealEstateModule`
6. Add validation (email format, phone format)

**Prerequisites:** Epic 8.1 complete
**Estimate:** 6 hours
**Priority:** P0

**Technical Notes:**
- Follow Twenty's entity pattern (architecture.md Section 4.1)
- Reference PRD v1.4 Section 4.8.2

---

#### Story 8.2.2: User Registration & Verification 📧

**As a** public user,
**I want** to register an account with email and phone verification,
**So that** I can access the marketplace as a verified user.

**Acceptance Criteria:**
- ✅ Given PublicUser entity (Story 8.2.1), When I submit registration form, Then system validates email/phone and creates user with `verified = false`
- ✅ Given user created, When verification sent, Then email verification link and SMS code sent
- ✅ Given email link clicked, When verified, Then `emailVerified = true`
- ✅ Given SMS code entered, When correct, Then `phoneVerified = true`
- ✅ Given both verified, When checked, Then `verified = true` and `verifiedAt` timestamp set

**Tech Tasks:**
1. Create `PublicUserResolver` with `registerPublicUser` mutation
2. Validate email format and uniqueness
3. Validate phone number (Vietnamese format)
4. Use existing email service from Twenty CRM
5. Integrate SMS service (Twilio or Vietnamese provider)
6. Generate verification tokens (24h expiry)
7. Implement rate limiting (max 3 attempts/IP/hour)
8. Create frontend registration form component

**Prerequisites:** Story 8.2.1
**Estimate:** 8 hours
**Priority:** P0

**Technical Notes:**
- SMS provider: VIETGUYS or similar
- Token security critical

---

#### Story 8.2.3: Public User Authentication 🔐

**As a** public user,
**I want** to log in with my email and password,
**So that** I can access my account and marketplace features.

**Acceptance Criteria:**
- ✅ Given verified account (Story 8.2.2), When I submit login credentials, Then system validates and generates JWT token (7-day expiry)
- ✅ Given token generated, When response sent, Then token and user profile returned
- ✅ Given JWT token, When created, Then includes: userId, email, userType, subscriptionTier, expiry, signature
- ✅ Given invalid credentials, When login attempted, Then 401 error returned
- ✅ Given unverified account, When login attempted, Then 403 error with message returned

**Tech Tasks:**
1. Extend Twenty's existing auth system for public users
2. Create `PublicAuthResolver` with `loginPublicUser` mutation
3. Use bcrypt for password hashing (already in Twenty)
4. Generate JWT with secret from environment
5. Set secure HTTP-only cookie
6. Implement refresh token mechanism
7. Create frontend login form component

**Prerequisites:** Story 8.2.2
**Estimate:** 6 hours
**Priority:** P0

**Technical Notes:**
- JWT secret from environment variable
- Secure cookie configuration

---

#### Story 8.2.4: Subscription Tiers & RBAC 💎

**As a** developer,
**I want** to implement subscription tiers with role-based access control,
**So that** users have appropriate permissions based on their subscription level.

**Acceptance Criteria:**
- ✅ Given public users authenticated (Story 8.2.3), When subscription tier set, Then permissions enforced: FREE (3 listings, 30 days), BASIC (10 listings, 60 days), PRO (unlimited, 90 days), ENTERPRISE (custom)
- ✅ Given RBAC permissions, When defined, Then includes: browse_listings (all), post_listing (registered), send_inquiry (all), save_favorites (registered), manage_own_listings (registered)
- ✅ Given permissions, When checked in resolvers, Then enforced via decorators

**Tech Tasks:**
1. Extend Twenty's RBAC system (architecture.md Section 7)
2. Create custom role: `PUBLIC_USER_ROLE`
3. Define subscription tier limits in code
4. Implement permission decorators: `@RequirePublicUserPermission()`
5. Check subscription limits in listing creation
6. Display subscription limits in frontend UI

**Prerequisites:** Story 8.2.3
**Estimate:** 6 hours
**Priority:** P1

**Technical Notes:**
- Subscription limits enforced at service layer
- Permission checks at resolver layer

---

#### Story 8.2.5: User Profile Management ⚙️

**As a** public user,
**I want** to view and update my profile information,
**So that** I can keep my account details current.

**Acceptance Criteria:**
- ✅ Given logged in (Story 8.2.3), When I navigate to profile, Then I see: fullName, email, phone, userType, subscriptionTier, listings count, responseRate, memberSince
- ✅ Given profile page, When I edit, Then I can update: fullName, phone (requires re-verification), password (requires current), profilePhoto
- ✅ Given changes made, When saved, Then validated and stored
- ✅ Given sensitive fields, When changed, Then additional verification required

**Tech Tasks:**
1. Create `updatePublicUserProfile` mutation
2. Create frontend profile page component
3. Implement form validation
4. Handle image upload for profile photo (Twenty's file storage)
5. Add audit log for profile changes
6. Implement rate limiting on updates

**Prerequisites:** Story 8.2.4
**Estimate:** 6 hours
**Priority:** P2

**Technical Notes:**
- Phone change requires re-verification
- Password change requires current password

---

### Epic 8.3: Public Listing Management (6 stories)

#### Story 8.3.1: PublicListing Entity & CRUD 🏠

**As a** developer,
**I want** to create the PublicListing entity with CRUD operations,
**So that** sellers can create and manage property listings.

**Acceptance Criteria:**
- ✅ Given PublicUser entity (Epic 8.2), When I create PublicListing entity, Then `PublicListingWorkspaceEntity` created with all fields from PRD 4.8.3
- ✅ Given entity created, When relations defined, Then `owner` → PublicUser, `property` → Property (nullable)
- ✅ Given fields defined, When status enum created, Then includes: DRAFT, PENDING_REVIEW, APPROVED, REJECTED, EXPIRED, SOLD
- ✅ Given entity complete, When GraphQL generated, Then CRUD operations available
- ✅ Given database, When migration run, Then PublicListing table created

**Tech Tasks:**
1. Create `public-listing.workspace-entity.ts`
2. Define fields: title, description, listingType, propertyType, price, location, images[], status
3. Define relations: owner, property
4. Add computed fields: viewCount, contactCount, daysListed
5. Add timestamps: createdAt, updatedAt, publishedAt, expiresAt
6. Create database migration
7. Add validation: price > 0, title max 100 chars, description max 2000 chars

**Prerequisites:** Epic 8.2 complete
**Estimate:** 6 hours
**Priority:** P0

**Technical Notes:**
- Image storage: Twenty's file storage system
- Reference PRD v1.4 Section 4.8.3

---

#### Story 8.3.2: Post Listing Flow 📝

**As a** seller,
**I want** to post a new property listing,
**So that** buyers can discover my property.

**Acceptance Criteria:**
- ✅ Given logged in as verified seller (Epic 8.2), When I submit listing form, Then system validates fields, checks subscription limits, uploads images, creates listing with DRAFT status
- ✅ Given listing form, When displayed, Then includes: basic info (title, description, type), property details (bedrooms, bathrooms, area, price), location (address, district, city, coordinates), images (up to subscription limit), contact info
- ✅ Given form, When validated, Then client-side validation active
- ✅ Given images, When uploaded, Then resized and optimized

**Tech Tasks:**
1. Create `createPublicListing` mutation in `PublicListingResolver`
2. Validate all required fields
3. Check subscription limits (active listings count)
4. Handle image upload (max 10MB/image, JPG/PNG/WebP)
5. Create frontend multi-step listing form
6. Use React Hook Form for form management
7. Implement auto-save draft functionality
8. Add location autocomplete (Google Maps API)

**Prerequisites:** Story 8.3.1
**Estimate:** 10 hours
**Priority:** P0

**Technical Notes:**
- Multi-step form for better UX
- Image optimization critical

---

#### Story 8.3.3: Admin Approval Workflow ✅

**As an** admin,
**I want** to review and approve/reject pending listings,
**So that** we maintain quality and prevent spam.

**Acceptance Criteria:**
- ✅ Given listing submitted with PENDING_REVIEW (Story 8.3.2), When I view moderation queue, Then I see: list of pending listings, details, trust score, spam flags, approve/reject buttons
- ✅ Given listing reviewed, When I approve, Then status changes to APPROVED and `publishedAt` set
- ✅ Given listing reviewed, When I reject, Then I provide reason and status changes to REJECTED
- ✅ Given approval/rejection, When processed, Then seller receives notification

**Tech Tasks:**
1. Create `approvePublicListing` and `rejectPublicListing` mutations
2. Create admin moderation queue component
3. Implement permissions (admin only)
4. Setup notification service (email + in-app)
5. Add audit log (who approved/rejected, when)
6. Implement bulk actions (approve/reject multiple)

**Prerequisites:** Story 8.3.2
**Estimate:** 8 hours
**Priority:** P0

**Technical Notes:**
- Queue should show trust score if available
- Spam flags should be highlighted

---

#### Story 8.3.4: Listing Status Management 🔄

**As a** seller,
**I want** to manage my listing status,
**So that** I can keep listings up-to-date.

**Acceptance Criteria:**
- ✅ Given approved listing (Story 8.3.3), When I navigate to dashboard, Then I see all my listings with status
- ✅ Given listing actions, When available, Then I can: edit (requires re-approval), renew (extends expiresAt), mark as sold (changes to SOLD), delete (draft/rejected only)
- ✅ Given status transitions, When executed, Then follow rules: APPROVED→DRAFT (edit), APPROVED→SOLD (sold), APPROVED→EXPIRED (auto), EXPIRED→PENDING_REVIEW (renew)
- ✅ Given auto-expiry, When job runs, Then daily job expires old listings

**Tech Tasks:**
1. Create mutations: `updatePublicListing`, `renewPublicListing`, `markListingAsSold`
2. Create seller dashboard component
3. Create background job: `ExpireListingsJob` (runs daily midnight)
4. Setup notifications (remind 3 days before expiry)
5. Add audit log for status changes

**Prerequisites:** Story 8.3.3
**Estimate:** 8 hours
**Priority:** P1

**Technical Notes:**
- Auto-expiry job critical for data quality
- Renewal extends by subscription duration

---

#### Story 8.3.5: Browse & Search Listings 🔍

**As a** buyer,
**I want** to browse and search property listings,
**So that** I can find properties matching my criteria.

**Acceptance Criteria:**
- ✅ Given approved listings (Story 8.3.3), When I navigate to browse page, Then I see: grid/list view, filters (location, type, price, bedrooms, area), sort options (newest, price), pagination (20/page), listing cards
- ✅ Given filters, When applied, Then results update dynamically
- ✅ Given search query, When entered, Then listings searched by: title, description, location
- ✅ Given Vietnamese text, When searched, Then diacritics supported

**Tech Tasks:**
1. Create `searchPublicListings` query with filters
2. Create frontend browse page with filter sidebar
3. Use PostgreSQL full-text search
4. Implement cursor-based pagination
5. Cache popular filter combinations in Redis
6. Ensure SSR-rendered for bots

**Prerequisites:** Story 8.3.4
**Estimate:** 10 hours
**Priority:** P0

**Technical Notes:**
- SEO critical - must be SSR
- Vietnamese text search important

---

#### Story 8.3.6: Listing Detail Page with SSR 📄

**As a** buyer,
**I want** to view detailed listing information,
**So that** I can decide if interested.

**Acceptance Criteria:**
- ✅ Given listing clicked from browse (Story 8.3.5), When detail page loads, Then I see: full image gallery, complete details, location map, seller contact, trust score, AI summary, inquiry form
- ✅ Given bot request, When page rendered, Then SSR with: dynamic meta tags, structured data (JSON-LD), all content pre-rendered
- ✅ Given page view, When tracked, Then viewCount incremented
- ✅ Given similar listings, When shown, Then displayed at bottom

**Tech Tasks:**
1. Create listing detail page component
2. Implement SSR in Express server (Epic 8.1)
3. Generate dynamic meta tags (title, description, OG tags)
4. Add structured data (Schema.org RealEstateListing)
5. Create image gallery with lightbox
6. Integrate Google Maps Embed API
7. Track page views and time on page
8. Implement similar listings recommendation

**Prerequisites:** Story 8.3.5, Epic 8.1 (SSR)
**Estimate:** 10 hours
**Priority:** P0

**Technical Notes:**
- Most critical page for SEO
- Structured data essential for rich snippets

---

### Epic 8.4: AI Research & Trust System (5 stories)

#### Story 8.4.1: AIResearchResult Entity & Job Setup 🔬

**As a** developer,
**I want** to create the AIResearchResult entity and background job infrastructure,
**So that** we can store and process AI research results.

**Acceptance Criteria:**
- ✅ Given PublicListing entity (Epic 8.3), When I create AIResearchResult entity, Then `AIResearchResultWorkspaceEntity` created with fields from PRD 4.8.4
- ✅ Given entity created, When relation defined, Then `listing` → PublicListing relation exists
- ✅ Given BullMQ job, When created, Then `AIResearchJob` triggered on listing approval
- ✅ Given job processor, When created, Then `AIResearchProcessor` handles job execution
- ✅ Given job queued, When listing approved, Then job automatically queued
- ✅ Given job execution, When processing, Then completes within 2 minutes with max 3 retry attempts

**Tech Tasks:**
1. Create `ai-research-result.workspace-entity.ts`
2. Define fields: sourcesChecked, similarListingsFound, priceRange, suspiciousPatterns, researchedAt
3. Create BullMQ job: `AIResearchJob`
4. Create processor: `AIResearchProcessor`
5. Queue job on listing status change to APPROVED
6. Implement retry logic (max 3 attempts)
7. Add job monitoring and error logging

**Prerequisites:** Epic 8.3 complete
**Estimate:** 6 hours
**Priority:** P0

**Technical Notes:**
- Follow Twenty's background job pattern (architecture.md Section 4.4)
- Use `@Processor()` and `@Process()` decorators
- Job queue: `public-marketplace-ai-research`
- Reference PRD v1.4 Section 4.8.4

---

#### Story 8.4.2: Perplexica API Integration 🌐

**As a** developer,
**I want** to integrate Perplexica API for web research,
**So that** we can research similar listings from other platforms.

**Acceptance Criteria:**
- ✅ Given AIResearchJob processing (Story 8.4.1), When job runs, Then Perplexica API called to research similar listings
- ✅ Given Perplexica API, When called, Then searches batdongsan.com.vn and chợ tốt for similar properties by location + price range
- ✅ Given API response, When received, Then extracts: title, price, location, contact, images from results
- ✅ Given extracted data, When stored, Then saved in `similarListingsFound` field (JSON array)
- ✅ Given rate limiting, When enforced, Then max 10 requests/minute per source respected

**Tech Tasks:**
1. Create `PerplexicaService` with API integration
2. Implement search methods for each source (batdongsan, chợ tốt)
3. Configure Perplexica API endpoint and authentication
4. Parse and extract data from API responses
5. Handle API errors (retry with exponential backoff)
6. Implement rate limiting
7. Cache results for 24 hours to reduce API calls
8. Sanitize and validate scraped data

**Prerequisites:** Story 8.4.1
**Estimate:** 10 hours
**Priority:** P0

**Technical Notes:**
- Use Perplexica API (not Puppeteer/Playwright as confirmed)
- Environment variables: `PERPLEXICA_API_URL`, `PERPLEXICA_API_KEY`
- Legal: Ensure compliance with terms of service

---

#### Story 8.4.3: AI Research Processing & Storage 📊

**As a** developer,
**I want** to process researched data and generate insights,
**So that** we provide valuable information to users.

**Acceptance Criteria:**
- ✅ Given Perplexica returns similar listings (Story 8.4.2), When AI research processes data, Then calculates: price range (min, max, average), detects suspicious patterns, counts sources checked
- ✅ Given suspicious patterns, When detected, Then flags: price >30% below market, duplicate images, contact matches known scammers, spam keywords in description
- ✅ Given processing complete, When results stored, Then all data saved in AIResearchResult entity
- ✅ Given listing updated, When flagged, Then `aiResearchCompleted = true` set
- ✅ Given processing time, When measured, Then completes within 2 minutes

**Tech Tasks:**
1. Create `AIResearchService` with analysis methods
2. Implement price analysis: calculate min, max, average from similar listings
3. Implement image comparison: use perceptual hashing (pHash) for duplicate detection
4. Implement spam detection: keyword matching + pattern recognition
5. Store results as JSON in AIResearchResult
6. Update listing's `aiResearchCompleted` flag
7. Add metrics tracking: job success rate, processing time
8. Store raw data for debugging (optional, with TTL)

**Prerequisites:** Story 8.4.2
**Estimate:** 8 hours
**Priority:** P0

**Technical Notes:**
- Image comparison: pHash algorithm for duplicate detection
- Spam keywords: maintain blacklist in database

---

#### Story 8.4.4: Trust Score Calculation Algorithm 🎯

**As a** developer,
**I want** to implement the trust score calculation algorithm,
**So that** buyers can assess listing reliability.

**Acceptance Criteria:**
- ✅ Given AI research results (Story 8.4.3), When trust score calculated, Then score (0-100) based on: seller verification (30pts), listing completeness (20pts), market alignment (20pts), research validation (15pts), engagement (10pts), platform history (5pts)
- ✅ Given score calculated, When stored, Then saved in `listing.trustScore` field
- ✅ Given score breakdown, When available, Then stored for transparency
- ✅ Given daily recalculation, When job runs, Then all listing scores updated

**Tech Tasks:**
1. Create `TrustScoreService` with `calculateTrustScore()` method
2. Implement weighted algorithm:
   - Seller verification: phone (+15), email (+15)
   - Listing completeness: all fields (+10), multiple images (+10)
   - Market alignment: price within range (+20)
   - Research validation: similar listings found (+10), no suspicious patterns (+5)
   - Engagement: views, inquiries, response rate (+10)
   - Platform history: account age, previous listings (+5)
3. Create background job: `RecalculateTrustScoresJob` (runs daily)
4. Store score history for trend analysis
5. Make weights configurable

**Prerequisites:** Story 8.4.3
**Estimate:** 6 hours
**Priority:** P1

**Technical Notes:**
- Algorithm: Weighted sum of factors
- Reference PRD v1.4 Section 4.8.6 for complete algorithm
- Configurable weights for tuning

---

#### Story 8.4.5: Display Trust Score & Research Results 🏆

**As a** buyer,
**I want** to see trust score and AI research results,
**So that** I can make informed decisions.

**Acceptance Criteria:**
- ✅ Given trust score calculated (Story 8.4.4), When I view listing detail, Then I see: trust score badge (0-100) with color (80-100 green, 50-79 yellow, 0-49 red), AI research summary (similar listings count, price range, market alignment), warning flags if suspicious patterns
- ✅ Given "View Details" clicked, When expanded, Then I see: full AI research breakdown, similar listings from other platforms, trust score factors, research timestamp
- ✅ Given research results, When displayed, Then user-friendly format with icons and colors

**Tech Tasks:**
1. Create `TrustScoreBadge` component
2. Create `AIResearchPanel` component (expandable)
3. Display trust score with color coding
4. Show AI research summary
5. Implement expandable details section
6. Add icons and visual indicators
7. Add tooltip explaining trust score
8. Link to similar listings (external, new tab)
9. Cache research results in component state

**Prerequisites:** Story 8.4.4
**Estimate:** 6 hours
**Priority:** P1

**Technical Notes:**
- Visual design critical for user trust
- Clear explanation of what trust score means

---

### Epic 8.5: AI Summary & Spam Filter (4 stories)

#### Story 8.5.1: OpenAI Integration & AI Summary Generation ✨

**As a** developer,
**I want** to integrate OpenAI GPT-4 for generating listing summaries,
**So that** buyers get AI-powered insights.

**Acceptance Criteria:**
- ✅ Given listing approved (Epic 8.3), When AI summary job runs, Then calls OpenAI GPT-4 via v98store key
- ✅ Given API called, When response received, Then generates summary with: property highlights (3-5 features), neighborhood analysis, investment potential, suitable buyer profile
- ✅ Given summary generated, When stored, Then saved in `listing.aiSummary` field (RICH_TEXT)
- ✅ Given processing time, When measured, Then completes within 10 seconds
- ✅ Given API errors, When occurred, Then retries 3 times with exponential backoff
- ✅ Given token usage, When tracked, Then cost monitored

**Tech Tasks:**
1. Create `OpenAIService` with `generateListingSummary()` method
2. Use existing v98store OpenAI key (already implemented)
3. Use GPT-4 model (or GPT-3.5-turbo for cost optimization)
4. Create effective prompt template including: listing data, location, price, area, Vietnamese market context
5. Parse and format response
6. Store in aiSummary field
7. Create background job: `GenerateAISummaryJob`
8. Implement rate limiting (max 100 requests/hour)
9. Track token usage and cost

**Prerequisites:** Epic 8.3 complete
**Estimate:** 8 hours
**Priority:** P0

**Technical Notes:**
- Use existing v98store key (confirmed)
- Prompt engineering critical for quality
- Reference PRD v1.4 Section 4.8.5

---

#### Story 8.5.2: Spam Detection Rules & Filtering 🛡️

**As a** developer,
**I want** to implement spam detection rules,
**So that** we automatically filter low-quality listings.

**Acceptance Criteria:**
- ✅ Given listing submitted (Epic 8.3), When spam detection runs, Then checks: duplicate detection (same title/description), suspicious keywords ("100% guaranteed", etc.), contact spam (multiple phones, external URLs), image spam (no images or stock photos), price anomalies (price=0 or unrealistically low), rapid posting (>5 listings/hour)
- ✅ Given spam detected, When flagged, Then listing marked with `spamScore` (0-100)
- ✅ Given high spam score (>70), When detected, Then auto-rejects listing, notifies admin, temporarily suspends user if repeated
- ✅ Given spam detection, When runs, Then executes before admin approval

**Tech Tasks:**
1. Create `SpamDetectionService` with rule-based checks
2. Implement duplicate detection: Levenshtein distance for text similarity
3. Maintain spam keyword blacklist in database
4. Check for multiple phone numbers and URLs in description
5. Validate images exist and not stock photos
6. Check price anomalies
7. Track user posting rate
8. Store spam flags in `listing.spamFlags` (JSON array)
9. Create `SpamRule` entity for configurable rules
10. Admin dashboard to review flagged listings

**Prerequisites:** Epic 8.3 complete
**Estimate:** 10 hours
**Priority:** P0

**Technical Notes:**
- Rules configurable via database
- Reference PRD v1.4 Section 4.8.7

---

#### Story 8.5.3: Content Moderation Queue 👮

**As an** admin,
**I want** to review flagged listings in moderation queue,
**So that** I can manually verify spam detection.

**Acceptance Criteria:**
- ✅ Given spam detection flags listings (Story 8.5.2), When I access moderation queue, Then I see: list sorted by spam score (highest first), listing details with spam flags highlighted, spam score breakdown, actions (approve, reject, mark false positive)
- ✅ Given listing approved, When action taken, Then spam flags cleared and listing published
- ✅ Given listing rejected, When action taken, Then rejected with reason
- ✅ Given false positive marked, When action taken, Then spam rules adjusted (feedback loop)
- ✅ Given queue statistics, When displayed, Then shows: total flagged, reviewed today, pending

**Tech Tasks:**
1. Create moderation queue component (similar to approval queue)
2. Create `reviewSpamFlag` mutation
3. Implement permissions (admin only)
4. Display spam flags with highlighting
5. Implement feedback loop: track false positives
6. Add bulk actions (approve/reject multiple)
7. Setup notifications (alert when queue >50 pending)
8. Add queue statistics dashboard

**Prerequisites:** Story 8.5.2
**Estimate:** 8 hours
**Priority:** P1

**Technical Notes:**
- Feedback loop improves detection over time
- Similar UI to approval queue

---

#### Story 8.5.4: Display AI Summary on Listings 💬

**As a** buyer,
**I want** to see AI-generated summary on listing pages,
**So that** I can quickly understand key insights.

**Acceptance Criteria:**
- ✅ Given AI summary generated (Story 8.5.1), When I view listing detail, Then I see: AI summary section with icon (✨ AI Insights), property highlights (bullet points), neighborhood analysis (paragraph), investment potential (rating/text), suitable buyer profile (text)
- ✅ Given summary displayed, When shown, Then clearly labeled as AI-generated
- ✅ Given rich text format, When rendered, Then displays bold, lists, etc.
- ✅ Given summary unavailable, When checked, Then section hidden
- ✅ Given mobile view, When displayed, Then responsive design

**Tech Tasks:**
1. Create `AISummaryPanel` component
2. Use rich text renderer for `aiSummary` field
3. Add sparkle/AI icon to indicate AI-generated
4. Style with distinct visual design
5. Implement loading state (skeleton while generating)
6. Add disclaimer: "AI-generated content, verify independently"
7. Make responsive for mobile

**Prerequisites:** Story 8.5.1
**Estimate:** 4 hours
**Priority:** P1

**Technical Notes:**
- Clear AI labeling important for transparency
- Distinct visual style differentiates from user content

---

### Epic 8.6: Inquiry & Lead Conversion (5 stories)

#### Story 8.6.1: Inquiry Entity & CRUD 💬

**As a** developer,
**I want** to create the Inquiry entity with CRUD operations,
**So that** buyers can send inquiries to sellers.

**Acceptance Criteria:**
- ✅ Given PublicListing entity (Epic 8.3), When I create Inquiry entity, Then `InquiryWorkspaceEntity` created with fields from PRD 4.8.8
- ✅ Given entity created, When relations defined, Then `listing` → PublicListing, `inquirer` → PublicUser (nullable)
- ✅ Given fields defined, When created, Then includes: message, contactPhone, contactEmail, preferredContact, status, notes
- ✅ Given status enum, When defined, Then includes: NEW, CONTACTED, CLOSED
- ✅ Given GraphQL, When generated, Then CRUD operations available
- ✅ Given database, When migration run, Then Inquiry table created

**Tech Tasks:**
1. Create `inquiry.workspace-entity.ts`
2. Define fields: message, contactPhone, contactEmail, preferredContact, status, notes
3. Define relations: listing, inquirer (nullable for anonymous)
4. Add validation: message min 10 chars, max 500 chars
5. Add timestamps: createdAt, respondedAt, closedAt
6. Create database migration
7. Support anonymous inquiries (inquirer = null)

**Prerequisites:** Epic 8.3 complete
**Estimate:** 4 hours
**Priority:** P0

**Technical Notes:**
- Anonymous inquiries supported
- Reference PRD v1.4 Section 4.8.8

---

#### Story 8.6.2: Inquiry Form & Notifications 📧

**As a** buyer,
**I want** to send an inquiry about a listing,
**So that** I can get more information.

**Acceptance Criteria:**
- ✅ Given listing detail page (Epic 8.3), When I submit inquiry form, Then creates Inquiry with NEW status, increments `listing.contactCount`, sends email to seller, sends SMS to seller (if enabled), sends confirmation to buyer, returns success message
- ✅ Given inquiry form, When displayed, Then includes: message textarea (required, 10-500 chars), contact phone (required), contact email (optional), preferred contact method (PHONE/EMAIL/BOTH), agreement checkbox
- ✅ Given rate limiting, When enforced, Then max 3 inquiries per IP per hour
- ✅ Given logged in user, When form shown, Then contact info pre-filled

**Tech Tasks:**
1. Create `createInquiry` mutation in `InquiryResolver`
2. Create inquiry form component (modal or inline)
3. Validate message length and contact info
4. Implement rate limiting (Redis-based, track IP)
5. Send email notification to seller (professional template)
6. Send SMS notification to seller (short with link)
7. Send confirmation email to buyer
8. Pre-fill form for logged-in users
9. Track inquiry conversion rate

**Prerequisites:** Story 8.6.1
**Estimate:** 8 hours
**Priority:** P0

**Technical Notes:**
- Rate limiting prevents spam
- Email/SMS templates professional

---

#### Story 8.6.3: Lead Conversion Workflow 🔄

**As a** developer,
**I want** to implement automatic lead conversion for internal properties,
**So that** inquiries become leads for sales agents.

**Acceptance Criteria:**
- ✅ Given inquiry created for listing with internal property link (Story 8.6.2), When processed, Then checks if `listing.property` exists, creates/updates Contact with inquirer info, creates Deal with: property, status NEW_LEAD, source PUBLIC_MARKETPLACE, notes (inquiry message), lead score (calculated), assigns to sales agent, sends notification to agent, links inquiry to deal
- ✅ Given lead score, When calculated, Then based on: verified contact (+30), quality message (+20), high trust listing (+20), budget indication (+15), timeline indication (+15)
- ✅ Given conversion, When executed, Then happens asynchronously (background job)

**Tech Tasks:**
1. Create `ConvertInquiryToLeadJob` background job
2. Trigger when inquiry created for listing with `property` link
3. Implement lead score algorithm (PRD 4.8.9)
4. Find or create Contact (match by phone/email)
5. Create Deal entity with appropriate fields
6. Use existing Deal entity from internal CRM
7. Link inquiry to deal (`inquiry.convertedToDeal`)
8. Add audit log for conversions

**Prerequisites:** Story 8.6.2
**Estimate:** 10 hours
**Priority:** P0

**Technical Notes:**
- Critical for business value - lead generation
- Reference PRD v1.4 Section 4.8.9

---

#### Story 8.6.4: Lead Assignment to Agents 👥

**As a** developer,
**I want** to assign converted leads to sales agents automatically,
**So that** leads are distributed fairly.

**Acceptance Criteria:**
- ✅ Given lead created from inquiry (Story 8.6.3), When assignment runs, Then uses existing lead assignment algorithm (Module 5), assigns based on: property location (agent territory), agent availability (not on leave), agent workload (active deals), round-robin within eligible agents
- ✅ Given agent assigned, When notified, Then receives: lead details (contact, property, inquiry message), trust score, lead score, inquiry timestamp
- ✅ Given no eligible agents, When checked, Then assigns to default admin and alerts management
- ✅ Given assignment time, When measured, Then completes within 1 minute

**Tech Tasks:**
1. Reuse existing `LeadAssignmentService` from Module 5
2. Extend to support PUBLIC_MARKETPLACE source
3. Send notification to assigned agent (email + in-app)
4. Include link to deal in CRM
5. Track SLA: time from inquiry to agent response
6. Add metrics: assignment success rate, response time

**Prerequisites:** Story 8.6.3
**Estimate:** 6 hours
**Priority:** P0

**Technical Notes:**
- Reuse existing Module 5 logic
- Reference PRD v1.4 Section 4.5

---

#### Story 8.6.5: Inquiry Management Dashboard 📊

**As a** seller,
**I want** to view and manage inquiries about my listings,
**So that** I can respond to buyers.

**Acceptance Criteria:**
- ✅ Given listings with inquiries (Story 8.6.2), When I navigate to inquiry dashboard, Then I see: list of all inquiries, details (listing, message, contact, timestamp), status (NEW/CONTACTED/CLOSED), actions (mark contacted, mark closed, add notes)
- ✅ Given filters, When available, Then can filter by: status, listing, search contact/message
- ✅ Given sorting, When available, Then can sort by date (newest first)
- ✅ Given NEW inquiries, When displayed, Then highlighted
- ✅ Given statistics, When shown, Then displays: total inquiries, response rate (% contacted within 24h), average response time

**Tech Tasks:**
1. Create inquiry dashboard component
2. Create queries: `getMyInquiries`, `getInquiryStats`
3. Create mutations: `updateInquiryStatus`, `addInquiryNotes`
4. Implement filters and sorting
5. Add real-time updates (WebSocket or polling)
6. Add browser notifications for new inquiries
7. Implement click-to-call if available
8. Add export to CSV functionality

**Prerequisites:** Story 8.6.4
**Estimate:** 8 hours
**Priority:** P1

**Technical Notes:**
- Real-time updates improve responsiveness
- Response rate metric important for seller quality

---

### Epic 8.7: Monetization & Analytics (4 stories)

#### Story 8.7.1: Subscription Payment Integration 💳

**As a** seller,
**I want** to upgrade my subscription tier with payment,
**So that** I can access premium features.

**Acceptance Criteria:**
- ✅ Given logged in as public user (Epic 8.2), When I select subscription tier (BASIC/PRO/ENTERPRISE), Then system displays details and pricing, redirects to VNPay gateway, processes payment securely, updates `subscriptionTier` and `subscriptionExpiresAt` on success, sends confirmation email with receipt
- ✅ Given payment methods, When available, Then supports: VNPay (Vietnamese gateway), MoMo wallet, Bank transfer (manual verification)
- ✅ Given subscription, When active, Then auto-renews before expiry (optional)
- ✅ Given payment history, When stored, Then available for accounting

**Tech Tasks:**
1. Integrate VNPay SDK for Node.js
2. Create `SubscriptionPaymentService`
3. Create mutations: `createPayment`, `verifyPayment`
4. Setup webhook to handle payment callbacks from VNPay
5. Validate payment signatures for security
6. Configure environment variables: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`
7. Create frontend payment flow component
8. Store pricing in database (`SubscriptionPlan` entity)

**Prerequisites:** Epic 8.2 complete
**Estimate:** 10 hours
**Priority:** P1

**Technical Notes:**
- VNPay SDK integration
- Reference PRD v1.4 Section 4.8.2 (Subscription Tiers)

---

#### Story 8.7.2: Featured Listings Feature ⭐

**As a** seller with PRO subscription,
**I want** to feature my listings,
**So that** they appear prominently in search results.

**Acceptance Criteria:**
- ✅ Given PRO or ENTERPRISE subscription (Story 8.7.1), When I select listing to feature, Then system checks quota (5/month for PRO), marks as featured (`isFeatured = true`), sets `featuredUntil` (30 days), deducts from quota, moves to top of search results
- ✅ Given featured listings, When displayed, Then shows "Featured" badge, appears at top of browse page, has highlighted styling, shows in "Featured Listings" section on homepage
- ✅ Given featured status, When expires, Then after 30 days status removed
- ✅ Given quota, When checked, Then remaining quota displayed

**Tech Tasks:**
1. Add fields to PublicListing: `isFeatured`, `featuredUntil`, `featuredCount`
2. Create mutation: `featureListing`
3. Modify search query: sort by `isFeatured DESC, createdAt DESC`
4. Create background job: `ExpireFeaturedListingsJob` (runs daily)
5. Create frontend feature button on listing management
6. Implement quota tracking (reset monthly on renewal)
7. Track analytics: featured listing performance (views, inquiries)

**Prerequisites:** Story 8.7.1
**Estimate:** 6 hours
**Priority:** P2

**Technical Notes:**
- Featured listings boost visibility significantly
- Quota enforcement at service layer

---

#### Story 8.7.3: Seller Analytics Dashboard 📈

**As a** seller,
**I want** to view analytics about my listings,
**So that** I can understand performance and optimize.

**Acceptance Criteria:**
- ✅ Given listings with activity (Epic 8.3, 8.6), When I navigate to analytics dashboard, Then I see: overview metrics (total listings, views, inquiries, conversion rate, response time), listing performance table (each listing with metrics, sortable), trends chart (views/inquiries over time, last 30 days), top performing listings
- ✅ Given filters, When available, Then can filter by date range (7 days, 30 days, all time)
- ✅ Given export, When clicked, Then data exported to CSV
- ✅ Given comparison, When enabled, Then can compare listings side-by-side

**Tech Tasks:**
1. Create analytics dashboard component with charts (Chart.js or Recharts)
2. Create query: `getSellerAnalytics` with date range filter
3. Pre-compute daily metrics (background job)
4. Store analytics in `ListingAnalytics` table (date, listingId, views, inquiries)
5. Cache dashboard data for 1 hour
6. Make responsive (mobile-friendly charts)
7. Implement CSV export functionality

**Prerequisites:** Story 8.7.2
**Estimate:** 10 hours
**Priority:** P2

**Technical Notes:**
- Pre-computed metrics for performance
- Cache to reduce database load

---

#### Story 8.7.4: Revenue Tracking & Reporting 💰

**As an** admin,
**I want** to track revenue from subscriptions and featured listings,
**So that** I can monitor business performance.

**Acceptance Criteria:**
- ✅ Given payments processed (Story 8.7.1, 8.7.2), When I access revenue dashboard, Then I see: revenue metrics (total, MRR, by source, ARPU), subscription metrics (active by tier, new/churned this month, conversion rate), revenue trends (last 12 months chart, growth rate), top customers (highest lifetime value)
- ✅ Given filters, When available, Then can filter by date range
- ✅ Given export, When clicked, Then revenue report exported to CSV/PDF
- ✅ Given transaction history, When viewed, Then detailed transactions shown

**Tech Tasks:**
1. Create admin revenue dashboard component
2. Create query: `getRevenueMetrics` (admin only)
3. Store transactions in `PaymentTransaction` entity
4. Pre-compute monthly metrics (background job)
5. Create revenue trends chart
6. Implement permissions (admin only access)
7. Generate PDF report with charts
8. Plan integration with accounting software (future)

**Prerequisites:** Story 8.7.3
**Estimate:** 8 hours
**Priority:** P2

**Technical Notes:**
- Admin only - strict permissions
- Financial data security critical

---

### Epic 8.8: Advanced Features & Optimization (3 stories)

#### Story 8.8.1: AI Consultation Chatbot 🤖

**As a** buyer,
**I want** to chat with an AI assistant about properties,
**So that** I get instant answers.

**Acceptance Criteria:**
- ✅ Given viewing marketplace (Epic 8.3), When I click chat icon, Then chatbot widget opens with: welcome message, suggested questions, text input, chat history
- ✅ Given question asked, When AI responds, Then understands Vietnamese, provides relevant answers about: property recommendations (budget/location), market trends/prices, neighborhood info, buying process guidance, responds within 3 seconds, cites sources
- ✅ Given context awareness, When chatting, Then remembers conversation history, knows which listing I'm viewing, personalizes based on search history (if logged in)

**Tech Tasks:**
1. Use OpenAI GPT-4 with function calling (v98store key)
2. Create `ChatbotService` with conversation management
3. Create chatbot widget component (floating button)
4. Include context: listing data, user search history, market data
5. Define functions for: property search, price lookup, etc.
6. Implement rate limiting (max 20 messages per session)
7. Store conversations for analysis (optional)
8. Add fallback: if AI fails, show contact form
9. Use GPT-3.5-turbo for simple queries (cost optimization)

**Prerequisites:** Epic 8.4, 8.5 complete
**Estimate:** 12 hours
**Priority:** P2

**Technical Notes:**
- Function calling for structured responses
- Cost optimization important

---

#### Story 8.8.2: Dynamic Sitemap & Structured Data 🗺️

**As a** developer,
**I want** to generate dynamic sitemap and structured data,
**So that** search engines better index listings.

**Acceptance Criteria:**
- ✅ Given listings exist (Epic 8.3), When search engines request `/sitemap.xml`, Then system generates XML sitemap with: all public URLs (homepage, browse, all approved listings, categories), URL metadata (last modified, change frequency, priority), daily updates (background job), correct content-type (application/xml)
- ✅ Given bots view listing pages (Epic 8.3.6), When rendered, Then includes structured data: Schema.org RealEstateListing JSON-LD, properties (name, description, price, address, images), validates with Google Rich Results Test
- ✅ Given sitemap generated, When submitted, Then to Google Search Console and Bing Webmaster Tools

**Tech Tasks:**
1. Create `/sitemap.xml` endpoint in Express SSR server
2. Generate sitemap using `sitemap` npm package
3. Create background job: `GenerateSitemapJob` (runs daily 2am)
4. Cache sitemap in Redis (24 hour TTL)
5. Add structured data to SSR meta tags (Story 8.1.5)
6. Use Schema.org RealEstateListing type
7. Validate with Google Rich Results Test tool
8. Add sitemap URL to robots.txt

**Prerequisites:** Epic 8.4, 8.5 complete
**Estimate:** 6 hours
**Priority:** P1

**Technical Notes:**
- Critical for SEO
- Structured data enables rich snippets

---

#### Story 8.8.3: Performance Optimization & Monitoring 🚀

**As a** developer,
**I want** to optimize platform performance and setup monitoring,
**So that** we ensure fast load times and catch issues early.

**Acceptance Criteria:**
- ✅ Given platform running (All epics), When performance optimized, Then achieves: SSR render <500ms (P95), API response <200ms (P95), Lighthouse SEO >90, page load <2s (P75), cache hit rate >80%
- ✅ Given optimizations implemented, When applied, Then includes: database query optimization (indexes, analysis), Redis caching for expensive queries, image optimization (WebP, lazy loading), CDN for static assets, code splitting for frontend, Gzip compression
- ✅ Given monitoring setup, When configured, Then includes: APM (New Relic or Datadog), error tracking (Sentry), uptime monitoring (Pingdom), custom metrics (SSR performance, cache hit rate, API latency), alerts (Slack/email for critical issues)

**Tech Tasks:**
1. Add database indexes on frequently queried fields
2. Use `EXPLAIN ANALYZE` to optimize slow queries
3. Implement multi-level caching (Redis + in-memory)
4. Use Sharp for image processing, serve WebP format
5. Setup CDN (CloudFlare or AWS CloudFront)
6. Implement code splitting with React.lazy()
7. Integrate APM SDK in server code
8. Setup Sentry for error tracking
9. Create Grafana dashboards for metrics
10. Run load testing with k6 or Artillery
11. Set and enforce performance budgets

**Prerequisites:** All previous epics complete
**Estimate:** 16 hours
**Priority:** P1

**Technical Notes:**
- Performance critical for SEO and UX
- Monitoring essential for production

---

## Epic 8 Summary

**Total Stories**: 38 stories across 8 sub-epics
**Timeline**: 16 weeks (Phase 4)
**Team**: 2 developers

**Story Distribution**:
- Epic 8.1 (Foundation & SSR): 6 stories, 32 hours
- Epic 8.2 (User Management): 5 stories, 32 hours
- Epic 8.3 (Listing Management): 6 stories, 52 hours
- Epic 8.4 (AI Research & Trust): 5 stories, 36 hours
- Epic 8.5 (AI Summary & Spam): 4 stories, 30 hours
- Epic 8.6 (Inquiry & Lead): 5 stories, 36 hours
- Epic 8.7 (Monetization): 4 stories, 34 hours
- Epic 8.8 (Advanced Features): 3 stories, 34 hours

**Total Estimated Hours**: 286 hours (~18 weeks for 2 developers)

**Key Milestones**:
- Week 2: SSR infrastructure complete
- Week 5: Core marketplace functional (users + listings)
- Week 9: AI features complete (research, summary, trust, spam)
- Week 11: Lead generation active
- Week 14: Monetization live
- Week 16: Advanced features & optimization complete

**Success Criteria**:
- ✅ 500 qualified leads/month by Month 12
- ✅ 5,000 registered users Year 1
- ✅ Lighthouse SEO score >90
- ✅ 10-15% lead conversion rate
- ✅ Break-even by Month 9

---

## Bước tiếp theo

Sau khi bạn đồng ý cấu trúc epic:
1. **Decompose Story:** Bẻ nhỏ từng epic thành stories chi tiết với acceptance criteria dạng BDD
2. **Architecture Planning:** Viết tech spec cho Epic 1 (foundation & setup)
3. **Sprint Planning:** Map stories vào các sprint 2 tuần

---

_Epic 8 (Public Marketplace) đã được thêm vào với 18/38 stories fully detailed. Các stories còn lại (Epic 8.4-8.8) sẽ được expand theo format tương tự._
