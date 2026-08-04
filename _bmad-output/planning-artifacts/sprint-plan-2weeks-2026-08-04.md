---
name: bdsai.vn - Sprint Plan 2 tuần (pilot)
status: draft
created: 2026-08-04
updated: 2026-08-04
---

# Sprint Plan — 2 tuần pilot bdsai.vn

> **Sprint Goal:** Validate demand từ môi giới Bình Thạnh 3-4 tỷ bằng công cụ Deal-Radar.  
> **Nguyên tắc:** 2 tuần này **không code to**. Code chỉ triển khai thin slice nếu pilot bắt buộc cần.

---

## Week 1 — Tuyển + kích hoạt môi giới

### Day 0 (Setup)
| # | Story/Task | Owner | Output | Priority |
|---|---|---|---|---|
| 1 | Rebrand copy Long Thành → Việt Nam (pilot default Bình Thạnh 3-4 tỷ) | Dev | PR #1 | P0 |
| 2 | Tạo Zalo burner + group Zalo private | PM | Group hoạt động | P0 |
| 3 | Set automation trên Nowing để gửi tin vào group Zalo khi trigger | PM/Nowing | Test tin gửi thành công | P0 |
| 4 | Lập list ≥30 môi giới Bình Thạnh | PM | CSV/Sheets | P0 |
| 5 | Quay demo 60s Deal-Radar | PM | Video | P1 |

### Day 1-3 (Outreach)
| # | Task | Owner | Mục tiêu |
|---|---|---|---|
| 6 | Nhắn 10-15 môi giới/ngày | PM | 3-5 rep/ngày |
| 7 | Onboard người rep vào group + tạo filter Deal-Radar thủ công | PM | 5 người kích hoạt |
| 8 | Phỏng vấn nhanh 2-3 người đã dùng | PM | Notes |

### Day 4-7 (Retention + Match thủ công)
| # | Task | Owner | Mục tiêu |
|---|---|---|---|
| 9 | Vá điểm ma sát onboarding | PM | 1-2 điểm |
| 10 | Gửi ≥1 match thủ công qua Nowing automation hoặc tay vào group Zalo | PM | Group có tin khớp |
| 11 | Chạm mốc 30 người thử | PM | Tracker |
| 12 | Review tuần 1 — đếm kích hoạt | PM | ≥15 kích hoạt |

---

## Week 2 — Retention + WTP + thin slice code nếu cần

### Day 8-10
| # | Story/Task | Owner | Mục tiêu |
|---|---|---|---|
| 13 | Nhắn lý do quay lại cho tuần 1 | PM | 50% quay lại |
| 14 | Gửi ≥1 match thật vào group Zalo qua Nowing automation | PM | 1 match |
| 15 | Hỏi 5 môi giới "sẽ trả tiền không?" | PM | 3 nói có |

### Day 11-14
| # | Story/Task | Owner | Mục tiêu |
|---|---|---|---|
| 16 | Vá retention ma sát | PM | 2 điểm |
| 17 | Nhờ giới thiệu đồng nghiệp | PM | 2-3 referrals |
| 18 | Tổng hợp số retention/match/WTP | PM | Tracker |
| 19 | **GATE go/no-go** | PM + PO | Quyết định |

---

## Thin slice code (chỉ làm nếu non-code pilot kẹt)

| # | Story | Condition | Estimate |
|---|---|---|---|
| C1 | Deal-Radar filter parser + alert list UI | Nếu cần tạo filter tự động | 1 ngày |
| C2 | Zalo notification queue | Nếu cần gửi alert tự động | 1 ngày |
| C3 | Aggregated source schema + manual import | Nếu cần data khớp nhiều | 1 ngày |

---

## Story dev plan (post-pilot)

Sau khi pilot xanh, dev theo thứ tự:

1. **Story 3.6** — Rebrand Bình Thạnh 3-4 tỷ
2. **Story 5.3** — Seller Workspace Dashboard layout
3. **Story 7.1a** — Nowing Engine Client — Base Client & Health Check
4. **Story 7.1e** — Nowing Engine Client — Cache & Resilience
5. **Story 5.1** — Deal-Radar MVP (depends on 7.1a/7.1e)
6. **Story 5.2** — Lead Management
7. **Story 7.1b** — Nowing Engine Client — AI Viết Tin
8. **Story 4.3** — AI viết tin đăng UI (depends on 7.1b)
9. **Story 7.1d** — Nowing Engine Client — Deal-Radar Matching
10. **Story 7.1c** — Nowing Engine Client — Market Summary
11. **Story 7.2a** — Browser Extension Scaffold
12. **Story 7.2b** — Browser Extension Content Script

---

## Capacity

- 1 PM (Luis): outreach, concierge, tracker.
- 1 Dev (assistant): thin slice code nếu cần.
- Legal: gửi 3 câu hỏi song song.
