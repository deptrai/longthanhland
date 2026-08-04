---
story: 5.1
epic: 5
status: atdd-pending
spec: _bmad-output/planning-artifacts/specs/spec-deal-radar-mvp-2026-08-04.md
---

# Story 5.1: Deal-Radar MVP

## User Story

As a môi giới,
I want tạo filter bằng lời và nhận alert khi có tin BĐS khớp,
So that tôi không bỏ lỡ cơ hội mua/bán cho khách hàng.

## Acceptance Criteria

**AC-1:** Given môi giới nhập filter bằng lời, when submit, then hệ thống parse thành fields và lưu filter.

**AC-2:** Given filter đã lưu, when môi giới xem danh sách, then filter xuất hiện.

**AC-3:** Given filter và danh sách tin, when request matches, then hệ thống trả về tin khớp theo rule-based matching.

**AC-4:** Given có tin mới khớp filter, when trigger matching, then tạo alert và gọi Nowing automation để gửi Zalo group.

**AC-5:** Given alert tồn tại, when môi giới đọc, then mark `isRead=true`.

## Challenge Log

- What if raw query is empty?
- What if property type is not recognized?
- What if location has multiple districts?
- What if minPrice > maxPrice?
- What if Nowing automation fails?
- What if multiple filters match same listing?
