---
name: bdsai.vn
version: 3.0
status: draft
created: 2026-08-04
updated: 2026-08-04
authors: Mary (BMAD PM) + Luis
---

# PRD v3.0 — bdsai.vn: AI-Powered Real Estate Workspace for Brokers

## 1. Vision

**bdsai.vn** là workspace BĐS có AI cho môi giới. Không phải sàn marketplace truyền thống. Môi giới dùng bdsai để:
- Tìm tin khớp nhu cầu khách hàng (Deal-Radar).
- Quản lý lead và tin đăng.
- Viết tin đăng bằng AI.
- Lưu tin từ các sàn BĐS bằng browser extension.

**Nowing = engine AI** chạy sau lưng. Bdsai gọi Nowing qua REST API cho các tác vụ AI.

**Scope:** bdsai.vn hỗ trợ bất động sản khắp Việt Nam.  
**Focus pilot 2 tuần:** Bình Thạnh, TP.HCM, phân khúc 3-4 tỷ (căn hộ, nhà phố).

## 2. Target Users

### 2.1 Môi giới BĐS (PRIMARY)
- Anh Minh, 32 tuổi, môi giới BĐS Bình Thạnh.
- Có 10-30 khách hàng tiềm năng.
- Pain: Tốn 2-3 giờ/ngày lướt các sàn tìm tin khớp.
- Want: 1 công cụ tự động alert khi có tin khớp, quản lý lead, viết tin nhanh.

### 2.2 Admin (SECONDARY)
- Duyệt tin, quản lý user, xem báo cáo.

## 3. Jobs To Be Done

- Tôi muốn tạo filter nhu cầu khách và nhận alert khi có tin khớp.
- Tôi muốn quản lý danh sách khách hàng tiềm năng và gán tin cho họ.
- Tôi muốn viết mô tả tin đăng hấp dẫn nhanh bằng AI.
- Tôi muốn lưu tin từ Batdongsan/Chợ Tốt vào workspace bằng 1 click.

## 4. Glossary

- **Deal-Radar:** công cụ tạo filter và nhận alert tin khớp.
- **Lead:** người mua/tiềm năng do môi giới quản lý.
- **Nowing engine:** external AI service bdsai gọi qua REST API.
- **Assisted post:** hướng dẫn seller tự đăng lên Chợ Tốt/Zalo (không proxy account).
- **Aggregated data:** tin từ nguồn ngoài, chỉ lưu facts + link nguồn, không SĐT raw.

## 5. Functional Requirements

FR1: User đăng ký bằng email + phone, xác thực qua Supabase Auth.
FR2: User đăng nhập, quản lý profile.
FR3: Seller tạo listing với AI gợi ý mô tả.
FR4: Admin approve/reject listings.
FR5: Buyer browse + search listings theo khu vực (default pilot: Bình Thạnh 3-4 tỷ).
FR6: Listing detail page SSR với SEO meta.
FR7: AI Summary phân tích listing.
FR8: Trust Score chấm điểm uy tín.
FR9: Smart Spam Filter.
FR10: Inquiry form gửi liên hệ cho seller.
FR11: Email notification khi có inquiry.
FR12: Listing auto-expire + renew + mark sold.
FR13: Dynamic sitemap.xml + robots.txt.
FR14: Admin quản lý users (ban/unban).
FR15: **Deal-Radar — tạo filter bằng lời, nhận alert khi có tin khớp.**
FR16: **Lead management — CRUD lead, trạng thái, gán listing.**
FR17: **AI viết tin đăng — AI viết lại mô tả từ thông tin cơ bản.**
FR18: **Nowing engine integration — bdsai gọi Nowing API cho AI tasks.**
FR19: **Browser extension MVP — lưu tin từ BDS/Chợ Tốt vào workspace.**
FR20: **Seller workspace — dashboard CRM cho môi giới.**
FR21: News feed BĐS.
FR22: Assisted post hướng dẫn seller tự đăng lên Chợ Tốt/Zalo.
FR23: **Nowing automation trigger — bdsai gọi Nowing automation khi có Deal-Radar match; Nowing gửi tin vào Zalo group của môi giới.**

## 6. Non-Functional Requirements

NFR1: SSR render < 500ms (P95)
NFR2: API response < 200ms (P95)
NFR3: Lighthouse SEO > 90
NFR4: Page load < 2s (P75)
NFR5: Supabase Free tier limits: 500MB DB, 1GB storage
NFR6: AI rate limit: max 100 calls/hour
NFR7: Deal-Radar alert latency < 5 phút (Nowing automation trigger → Zalo group)
NFR8: Vietnamese full-text search support
NFR9: Image max 10MB, auto-convert WebP
NFR10: Domain: bdsai.vn
NFR11: Không lưu sellerPhone raw từ nguồn crawl/extension
NFR12: Browser extension MV3 tuân thủ Chrome Web Store policy

## 7. Out of Scope

- Xaction proxy auto-post Facebook/Batdongsan/Chợ Tốt (rủi ro ToS/pháp lý).
- Auto-import crawl từ nguồn ngoài (thay bằng browser extension user-consent hoặc admin manual import).
- Mobile app.
- Thu phí trong 2 tuần pilot.

## 8. Compliance & Pháp lý

- Không lưu SĐT raw từ crawl.
- Browser extension không tự động bấm "Hiện số".
- Aggregated data chỉ lưu facts + link nguồn.
- AI insights kèm disclaimer.

## 9. Success Metrics (2 tuần pilot)

- ≥30 môi giới tiếp cận.
- ≥15 kích hoạt.
- ≥10 quay lại tuần 2.
- ≥2 match thật gửi vào group Zalo.
- ≥3 môi giới nói sẽ trả tiền.

## 10. Changelog

| Ngày | Thay đổi |
|---|---|
| 2026-06-22 | PRD v2.0 MVP marketplace Long Thành |
| 2026-08-04 | PRD v3.0 pivot sang workspace BĐS Bình Thạnh, Nowing engine, Deal-Radar, browser extension; bỏ Xaction proxy |
