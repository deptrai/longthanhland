# Yêu cầu từ bdsai.vn → Team XActions

> Tài liệu handoff: bdsai.vn Epic 5 (Multi-Channel Promotion) đã hoàn tất 8/8 stories.
> Một số tính năng bị block do phụ thuộc XActions API. Đây là danh sách yêu cầu
> để team XActions implement tiếp, giúp bdsai.vn unblock các MVP hiện tại.

**Ngày phát hành:** 2026-06-27
**Bên yêu cầu:** bdsai.vn (longthanhland repo)
**Bên nhận:** XActions team (XActions repo)
**Epic liên quan:** bdsai.vn Epic 5 — Multi-Channel Promotion (DONE, 8/8 stories)

---

## Tổng quan tình trạng hiện tại

bdsai.vn đã tích hợp XActions REST API (`POST /api/facebook/automate`) để cross-post
listing lên Facebook. Tích hợp hoạt động production-ready (395 API tests pass, build OK).

Nhưng 4 tính năng bị **block do XActions chưa implement**:

| # | Tính năng bdsai.vn cần | Story bdsai.vn | XActions hiện tại | MVP workaround |
|---|----------------------|---------------|-------------------|----------------|
| 1 | Đăng ảnh lên Facebook | 5.5 | `mediaUrls` field tồn tại nhưng "reserved" — text-only | Forward-compatible plumbing (pass URL, XActions bỏ qua) |
| 2 | Auto-post lên Chợ Tốt | 5.3 | Chưa có adapter | Assisted MVP (seller tự copy-paste) |
| 3 | Auto-post lên Zalo | 5.4 | Chưa có adapter | Assisted MVP (seller tự copy-paste) |
| 4 | Auto-scrape FB pages/groups → News Feed | 5.8 | Có scrape (Epic 1) nhưng chưa có pipeline export | Admin curated MVP (thêm bài thủ công) |
| 5 | Auto-import listings từ external sources | 5.7 | Có scrape posts (1.3) nhưng chưa có pipeline export | Admin manual CSV/JSON import |

---

## P0 — Ảnh đăng lên Facebook (unblock Story 5.5)

### Bối cảnh
- bdsai.vn `XactionsClient.postToFacebook()` đã pass `mediaUrls: string[]` trong body
- XActions `POST /api/facebook/automate` nhận field nhưng trả `mediaUrlsNote: "accepted but text-only post in MVP"`
- Seller đăng BĐS không có ảnh → engagement thấp, post bị "naked text"

### Yêu cầu

**FR-1.1:** Implement Facebook photo upload trong `createSinglePost` flow
- Input: `mediaUrls: string[]` (1-10 URLs, đã validate ở bdsai.vn)
- Flow: download URL → upload vào Facebook composer → attach vào post
- Output: `postUrl` (nếu capture được) + `mediaUrlsAttached: number`

**FR-1.2:** Giữ backward-compatibility
- `mediaUrls: []` hoặc omitted → text-only post (như hiện tại)
- `mediaUrls: [...]` → upload ảnh, fallback text-only nếu upload fail (log warning)

**FR-1.3:** Rate limit + safety
- Max 10 ảnh/post (Facebook limit)
- Delay 2-5s giữa mỗi ảnh upload (anti-detection, consistent với ADR-012)
- Dry-run mode: skip upload, echo `mediaUrlsNote: "N images would be attached"`

**FR-1.4:** REST API contract (không breaking change)
```http
POST /api/facebook/automate
{
  "action": "post",
  "text": "Bán nhà...",
  "mediaUrls": ["https://cdn.bdsai.vn/img/1.jpg", "https://cdn.bdsai.vn/img/2.jpg"],
  "authCookie": { "accountId": "..." },
  "dryRun": false
}
```
Response:
```json
{
  "ok": true,
  "operationId": "op_abc123",
  "postUrl": "https://facebook.com/...",
  "mediaUrlsAttached": 2
}
```

**FR-1.5:** Tests
- Unit test: `mediaUrls` validation (max 10, URL format, empty array = text-only)
- Dry-run test: echo note, no browser launch
- Live test (deferred): verify upload trên test FB account

### Liên kết code
- XActions: `api/services/facebookAutomation.js` → `createSinglePost` (~line 1553)
- XActions: `api/services/facebookAutomation.js` → `scheduleFacebookPost` (~line 752, JSDoc `mediaUrls`)
- bdsai.vn: `bdsai/apps/api/src/xaction/xactions-client.ts` → `postToFacebook()` (line 69-128)
- bdsai.vn: `bdsai/apps/api/src/xaction/providers/facebook.provider.ts`

---

## P1 — Chợ Tốt Adapter (unblock Story 5.3 full automation)

### Bối cảnh
- Chợ Tốt (chotot.com) không có public API
- bdsai.vn Story 5.3 hiện là "Assisted MVP": format listing → seller tự copy-paste lên Chợ Tốt
- XActions đã có pattern browser automation cho Facebook (Puppeteer + cookie auth) → có thể reuse cho Chợ Tốt

### Yêu cầu

**FR-2.1:** Chợ Tốt scraper/adapter scaffold (mirror Facebook adapter pattern)
- `src/scrapers/chotot/index.js` — Puppeteer adapter
- Login via cookie (`c_user` + `xs` tương đương) hoặc email/password
- Anti-detection: `--disable-web-security` (consistent với Facebook adapter), 1-3s delay

**FR-2.2:** Create listing on Chợ Tốt
- `POST /api/chotot/automate` với `action: 'create-listing'`
- Input: `{ title, description, price, category, location, images[], authCookie }`
- Flow: login → navigate to "Đăng tin" → fill form → upload images → submit
- Output: `{ ok, operationId, listingUrl }`

**FR-2.3:** Chợ Tốt listing categories mapping
- BĐS bán: `mua-ban-nha-dat`
- BĐS cho thuê: `cho-thue-nha-dat`
- bdsai.vn sẽ pass `category` field, XActions map sang Chợ Tốt category ID

**FR-2.4:** REST API + MCP + CLI surfaces (mirror Facebook Epic 3)
- REST: `POST /api/chotot/automate`
- MCP: `chotot_automate` tool
- CLI: `xactions chotot automate --action create-listing ...`

**FR-2.5:** Tests
- Unit: input validation, dry-run (no browser)
- Live verify (deferred): cần test Chợ Tốt account

### Blocker
- **Cần test Chợ Tốt account** (email + password hoặc cookie session)
- **ToS compliance check** — Chợ Tốt ToS có cấm automation không? (cần legal review trước khi implement)

---

## P1 — Zalo Adapter (unblock Story 5.4 full automation)

### Bối cảnh
- Zalo không có public API cho posting trên Zalo Feed/Page
- bdsai.vn Story 5.4 hiện là "Assisted MVP": format listing → seller tự copy-paste
- XActions có thể build browser automation tương tự Facebook

### Yêu cầu

**FR-3.1:** Zalo adapter scaffold
- `src/scrapers/zalo/index.js` — Puppeteer adapter
- Login via cookie (zalo.me cookies) hoặc QR code session
- Zalo web: `https://chat.zalo.me` hoặc `https://zalo.me`

**FR-3.2:** Create post on Zalo Feed
- `POST /api/zalo/automate` với `action: 'create-post'`
- Input: `{ text, images[], authCookie }`
- Flow: login → navigate to Feed → compose → upload images → post
- Output: `{ ok, operationId, postUrl }`

**FR-3.3:** REST + MCP + CLI surfaces (mirror Facebook)

**FR-3.4:** Tests
- Unit: input validation, dry-run
- Live verify (deferred): cần test Zalo account

### Blocker
- **Cần test Zalo account**
- **ToS compliance check** — Zalo ToS có cấm automation không?
- **Zalo web có cho post lên Feed không?** (cần verify UI — Zalo web chủ yếu là chat, post Feed có thể chỉ trên mobile app)

---

## P2 — Facebook Scrape Pipeline → bdsai.vn News Feed (unblock Story 5.8 auto)

### Bối cảnh
- bdsai.vn Story 5.8 (News Feed BĐS) hiện là admin-curated MVP — admin tự thêm bài viết
- PRD yêu cầu auto-scrape tin tức BĐS từ Facebook pages/groups
- XActions đã có Facebook scrape (Epic 1: scrape posts, search posts) nhưng chưa có pipeline export ra external system

### Yêu cầu

**FR-4.1:** Scheduled scrape pipeline
- Config: list of FB page URLs / group URLs to monitor (e.g. `batdongsan.com.vn`, các group BĐS)
- Schedule: cron mỗi 1-6 giờ
- Output: JSON array of posts `{ url, text, images[], author, publishedAt, engagementCount }`

**FR-4.2:** Webhook hoặc REST endpoint cho bdsai.vn pull
- Option A (webhook): XActions POST to `bdsai.vn/api/news/ingest` khi có post mới
- Option B (pull): bdsai.vn GET `XActions/api/facebook/scrape-feed?since=<timestamp>`
- Recommend Option B (pull) — bdsai.vn chủ động kiểm soát

**FR-4.3:** Filter + classify
- Keyword filter: "bất động sản", "nhà đất", "thị trường", "pháp lý", "dự án", "tài chính"
- Category classification: bdsai.vn có 4 categories (thi-truong, phap-ly, du-an, tai-chinh)
- Dedup: XActions dedup by post URL (bdsai.vn cũng có dedup hash riêng)

**FR-4.4:** bdsai.vn ingest endpoint (bdsai.vn sẽ implement khi XActions sẵn sàng)
- `POST /api/news/ingest` — nhận batch posts từ XActions
- Tự động tạo `news_articles` rows (status: `draft` cho admin review)

### Blocker
- **ToS compliance** — Facebook ToS cấm scrape dữ liệu cá nhân, nhưng page/group public posts có thể OK (cần legal review)
- **Live FB session** — cần test FB account để verify selectors (XActions deferred-work.md có nhiều item BLOCKED on live session)

---

## P2 — Auto-Import Listings Pipeline (unblock Story 5.7 auto)

### Bối cảnh
- bdsai.vn Story 5.7 (Auto-Import Deduplication) hiện là admin manual CSV/JSON import
- PRD yêu cầu auto-import listings từ FB pages/groups (seller đăng BĐS trên FB → auto tạo listing trên bdsai.vn)
- XActions đã có `scrapePosts` (Story 1.3) — có thể reuse

### Yêu cầu

**FR-5.1:** Scrape BĐS listings từ FB pages/groups
- Config: list of FB pages/groups to scrape (e.g. group "BĐS Long Thành", page "Mua bán nhà đất")
- Schedule: cron mỗi 1-6 giờ
- Output: JSON array of listings `{ sourceUrl, title, description, price, phone, images[], location, postedAt }`

**FR-5.2:** Phone number extraction
- Parse phone từ post text (regex VN: `0\d{9,10}`, `+84\d{9,10}`)
- Hash phone (SHA256 + salt) trước khi gửi cho bdsai.vn (privacy — bdsai.vn DedupService dùng `sellerPhoneHash`)

**FR-5.3:** REST endpoint cho bdsai.vn pull
- `GET /api/facebook/scrape-listings?source=<page_url>&since=<timestamp>`
- Response: `{ listings: [...], nextCursor }`

**FR-5.4:** bdsai.vn import endpoint (bdsai.vn đã có sẵn)
- bdsai.vn `POST /admin/import/json` — nhận JSON array, chạy DedupService, tạo `imported_listings` rows
- bdsai.vn sẽ implement cron job pull từ XActions khi XActions sẵn sàng

### Blocker
- **ToS compliance** — scrape listings từ FB group có vi phạm ToS không? (cần legal review)
- **Live FB session** — selectors UNVERIFIED (XActions deferred-work.md: Story 1.3 có 4 items BLOCKED on live session)
- **Phone number accuracy** — regex có thể miss/false-positive, cần verify trên real data

---

## P3 — Tích hợp sâu hơn (future)

### FR-6.1: Batch post to Facebook groups (XActions đã có — Story 4.5)
- XActions `batchPostToGroups` đã implement
- bdsai.vn có thể tích hợp: seller chọn nhiều FB groups → cross-post 1 listing lên tất cả
- Cần REST endpoint `POST /api/facebook/automate` với `action: 'batch-post-groups'`

### FR-6.2: Facebook group member scrape (XActions đã có — Story 4.6)
- XActions `scrapeGroupMembers` đã implement
- bdsai.vn có thể: scrape members từ BĐS groups → lead generation
- Cần REST endpoint `GET /api/facebook/scrape-group-members?groupUrl=...`

### FR-6.3: Auto-like + auto-comment warmup (XActions đã có — Epic 2)
- XActions `likeFacebookPosts`, `commentFacebookPosts` đã implement
- bdsai.vn có thể: warmup FB account trước khi cross-post (tăng trust score)
- Cần REST endpoint `POST /api/facebook/automate` với `action: 'warmup'`

---

## Tóm tắt ưu tiên

| Priority | Yêu cầu | Story bdsai.vn unblock | Effort ước tính | Blocker |
|----------|---------|----------------------|-----------------|---------|
| **P0** | FR-1: Facebook image upload | 5.5 (full) | Medium | Live FB session verify |
| **P1** | FR-2: Chợ Tốt adapter | 5.3 (full) | Large | Test account + ToS review |
| **P1** | FR-3: Zalo adapter | 5.4 (full) | Large | Test account + ToS review + Zalo web UI verify |
| **P2** | FR-4: FB scrape → News Feed | 5.8 (auto) | Medium | ToS review + live session |
| **P2** | FR-5: FB scrape → Auto-import | 5.7 (auto) | Medium | ToS review + live session |
| **P3** | FR-6: Batch post + warmup | New features | Small (đã có, chỉ cần REST expose) | — |

---

## Điều kiện bàn giao

Mỗi yêu cầu khi hoàn tất cần:
1. **REST API contract** ổn định (không breaking change sau khi bdsai.vn tích hợp)
2. **Unit tests** pass (no mock/stub — XActions rule)
3. **Dry-run mode** hoạt động (no browser launch)
4. **Docs update** `docs/agents/selectors-*.md` nếu có selector mới
5. **Notification** cho bdsai.vn team khi API sẵn sàng (bdsai.vn sẽ implement client-side integration)

---

## Liên hệ

- bdsai.vn repo: `longthanhland` (branch `production`)
- XActions repo: `XActions` (branch `develop`)
- Tài liệu này: `_bmad-output/implementation-artifacts/xaction-team-requirements.md`
