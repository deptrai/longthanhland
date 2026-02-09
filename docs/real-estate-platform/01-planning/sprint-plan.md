# Sprint Plan: Real Estate Sales Distribution Platform

**Date**: 09/12/2025
**Author**: Luis (Winston - Architect)
**Version**: 1.0
**Sprint Length**: 2 weeks
**Team Size**: 2-3 developers (assumed)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Epics** | 7 |
| **Total Stories** | 38 |
| **MVP Sprints** | 4 (+ Phase 0) |
| **MVP Duration** | ~9 weeks |
| **Phase 2 Sprints** | 2 |
| **Total Duration** | ~13 weeks |

---

## Timeline Overview

```
Week 1     Week 2-3    Week 4-5    Week 6-7    Week 8-9    Week 10-11   Week 12-13
|----------|-----------|-----------|-----------|-----------|------------|-----------|
| Phase 0  | Sprint 1  | Sprint 2  | Sprint 3  | Sprint 4  | Sprint 5   | Sprint 6  |
| 3 days   | Epic 1    | Epic 2    | Epic 3+4  | Epic 5    | Epic 6     | Epic 7    |
|          |           |           |           | + Buffer  |            |           |
|<---------- MVP (9 weeks) --------->|         |<----- Phase 2 (4 weeks) ----->|
```

---

## Phase 0: Technical Validation (3 days)

**Goal**: Validate Twenty CRM extension capability before full investment

| Day | Task | Owner | Deliverable |
|-----|------|-------|-------------|
| 1 | Clone Twenty v0.52.0, setup environment | Dev | Working dev environment |
| 2 | Create empty real-estate module, verify registration | Dev | Module compiles |
| 3 | POC: Create simple entity, test GraphQL auto-generation | Dev | POC report |

**Exit Criteria**:
- [ ] Twenty CRM runs locally
- [ ] Custom module registered without errors
- [ ] GraphQL endpoint responds
- [ ] Decision: GO / NO-GO for full implementation

---

## Sprint 1: Foundation (Epic 1)

**Duration**: 2 weeks
**Capacity**: ~80 story points (assuming 40 SP/week)
**Epic**: Epic 1 - Nền tảng & Khởi tạo hệ thống

### Sprint Backlog

| Story | Title | Points | Priority | Dependencies |
|-------|-------|--------|----------|--------------|
| 1.1 | Project Initialization | 3 | P0 | None |
| 1.2 | Development Environment Setup | 5 | P0 | 1.1 |
| 1.3 | Real Estate Module Structure | 8 | P0 | 1.2 |
| 1.4 | RBAC & Authentication Configuration | 8 | P1 | 1.3 |
| 1.5 | Deployment Pipeline Setup | 8 | P1 | 1.3 |

**Total**: 32 SP

### Sprint Goals
1. ✅ Working development environment
2. ✅ Real-estate module skeleton created
3. ✅ RBAC configured for 4 roles
4. ✅ Staging deployment working

### Definition of Done
- [ ] All stories completed
- [ ] All ACs verified
- [ ] No TypeScript errors
- [ ] Server starts without runtime errors
- [ ] Staging deployment accessible

---

## Sprint 2: Inventory Management (Epic 2)

**Duration**: 2 weeks
**Capacity**: ~80 SP
**Epic**: Epic 2 - Quản lý Tồn kho Bất động sản

### Sprint Backlog

| Story | Title | Points | Priority | Dependencies |
|-------|-------|--------|----------|--------------|
| 2.1 | Project Entity CRUD | 8 | P0 | Epic 1 |
| 2.2 | Property Entity CRUD | 8 | P0 | 2.1 |
| 2.3 | Reservation System | 13 | P0 | 2.2 |
| 2.4 | Auto-Release Job | 8 | P0 | 2.3 |
| 2.5 | Double-Booking Prevention | 8 | P0 | 2.3 |
| 2.6 | Dashboard Widgets | 5 | P1 | 2.2 |
| 2.7 | File Gallery | 5 | P1 | 2.1 |

**Total**: 55 SP

### Sprint Goals
1. ✅ Project and Property entities working
2. ✅ Reservation system with 24h auto-release
3. ✅ Double-booking prevented via locking
4. ✅ Basic dashboard widgets

### Key Technical Challenges
- Pessimistic locking implementation
- BullMQ job scheduling
- Cron job for missed releases

---

## Sprint 3: Deals & Sales Tools (Epic 3 + 4)

**Duration**: 2 weeks
**Capacity**: ~80 SP
**Epics**: Epic 3 + Epic 4

### Sprint Backlog

| Story | Title | Points | Priority | Epic |
|-------|-------|--------|----------|------|
| 3.1 | Contact Extension | 5 | P0 | 3 |
| 3.2 | Deal Entity | 8 | P0 | 3 |
| 3.3 | Auto-Create Deal on Deposit | 8 | P0 | 3 |
| 3.4 | Deal Pipeline Kanban | 8 | P1 | 3 |
| 3.5 | Deal-Property Status Sync | 5 | P1 | 3 |
| 4.1 | User Extensions | 5 | P1 | 4 |
| 4.2 | Sales Dashboard | 8 | P1 | 4 |
| 4.3 | Performance Widgets | 8 | P1 | 4 |
| 4.4 | My Reserved Properties | 5 | P1 | 4 |
| 4.5 | Commission Tracking (View) | 5 | P2 | 4 |

**Total**: 65 SP

### Sprint Goals
1. ✅ Contact and Deal entities working
2. ✅ Deal auto-created when property deposit paid
3. ✅ Sales dashboard with performance widgets
4. ✅ "My Reserved Properties" with countdown timer

---

## Sprint 4: Commission + Buffer (Epic 5)

**Duration**: 2 weeks
**Capacity**: ~80 SP
**Epic**: Epic 5 + Buffer for bug fixes

### Sprint Backlog

| Story | Title | Points | Priority | Epic |
|-------|-------|--------|----------|------|
| 5.1 | Commission Entity | 8 | P0 | 5 |
| 5.2 | Auto-Calculate on Deal WON | 8 | P0 | 5 |
| 5.3 | Approval Workflow | 8 | P0 | 5 |
| 5.4 | CSV Export | 5 | P1 | 5 |
| 5.5 | Commission Reports | 8 | P1 | 5 |
| BUF | Bug fixes & polish | 20 | P1 | - |

**Total**: 57 SP

### Sprint Goals
1. ✅ Commission auto-created when Deal = WON
2. ✅ Admin can approve/reject commissions
3. ✅ Finance can export CSV for batch payment
4. ✅ All MVP bugs fixed

### MVP Release Checklist
- [ ] All Epic 1-5 stories complete
- [ ] All critical bugs fixed
- [ ] Performance targets met (<200ms API)
- [ ] Security review passed
- [ ] User acceptance testing passed
- [ ] Production deployment ready

---

## 🎉 MVP RELEASE (End of Sprint 4)

**MVP Features**:
- ✅ Project & Property management
- ✅ Reservation with auto-release
- ✅ Double-booking prevention
- ✅ Deal pipeline
- ✅ Commission tracking & approval
- ✅ Sales dashboard
- ✅ RBAC (Admin, Sales, Finance, Manager)

---

## Phase 2: Sprint 5 - Lead Distribution (Epic 6)

**Duration**: 2 weeks
**Capacity**: ~80 SP
**Epic**: Epic 6 - Phân phối Lead & Tự động hóa

### Sprint Backlog

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| 6.1 | Lead Extension Fields | 5 | P0 |
| 6.2 | Auto-Assignment Algorithm | 13 | P0 |
| 6.3 | SLA Tracking | 8 | P0 |
| 6.4 | Notification System | 13 | P1 |
| 6.5 | Admin Assignment Dashboard | 8 | P1 |
| 6.6 | Manual Override | 5 | P1 |

**Total**: 52 SP

### Sprint Goals
1. ✅ Leads auto-assigned to sales agents
2. ✅ Round-robin with capacity check
3. ✅ SLA tracking (30 min response)
4. ✅ Email + Zalo notifications

---

## Phase 2: Sprint 6 - Operations (Epic 7)

**Duration**: 2 weeks
**Capacity**: ~80 SP
**Epic**: Epic 7 - Vận hành & Mở rộng

### Sprint Backlog

| Story | Title | Points | Priority |
|-------|-------|--------|----------|
| 7.1 | Interactive Plot Map | 13 | P1 |
| 7.2 | Advanced Reports | 13 | P1 |
| 7.3 | Admin Tools | 8 | P1 |
| 7.4 | Pilot Program Support | 8 | P2 |

**Total**: 42 SP

### Sprint Goals
1. ✅ Interactive SVG plot map
2. ✅ Sales, inventory, commission reports
3. ✅ Admin impersonation
4. ✅ In-app training materials

---

## Velocity & Capacity Planning

### Assumed Team Composition
| Role | Count | Availability |
|------|-------|--------------|
| Senior Developer | 1 | 100% |
| Mid Developer | 1-2 | 100% |
| QA (part-time) | 0.5 | 50% |

### Story Point Estimates
| Size | Points | Description |
|------|--------|-------------|
| XS | 1-2 | Config change, simple fix |
| S | 3-5 | Single component, straightforward |
| M | 8 | Multiple components, some complexity |
| L | 13 | Complex feature, multiple integrations |
| XL | 21 | Epic-level, should be broken down |

### Sprint Velocity Target
- **Sprint 1**: 32 SP (ramp-up)
- **Sprint 2-4**: 55-65 SP (steady state)
- **Sprint 5-6**: 50-55 SP (new features)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Twenty CRM incompatibility | High | Phase 0 validation |
| Scope creep | Medium | Strict story acceptance |
| Performance issues | Medium | Early load testing |
| Team availability | Medium | Buffer in Sprint 4 |

---

## Milestones

| Milestone | Date (Relative) | Deliverable |
|-----------|-----------------|-------------|
| Phase 0 Complete | Day 3 | GO/NO-GO decision |
| Sprint 1 Complete | Week 3 | Foundation ready |
| Sprint 2 Complete | Week 5 | Inventory working |
| Sprint 3 Complete | Week 7 | Deals + Dashboard |
| **MVP Release** | Week 9 | Full MVP deployed |
| Sprint 5 Complete | Week 11 | Lead distribution |
| Sprint 6 Complete | Week 13 | Full platform |

---

## Sprint Ceremonies

| Ceremony | Frequency | Duration | Participants |
|----------|-----------|----------|--------------|
| Sprint Planning | Every 2 weeks | 2 hours | All |
| Daily Standup | Daily | 15 min | Dev team |
| Sprint Review | Every 2 weeks | 1 hour | All + stakeholders |
| Sprint Retro | Every 2 weeks | 1 hour | Dev team |
| Backlog Grooming | Weekly | 1 hour | PM + Dev lead |

---

## Appendix: Story Point Summary

| Epic | Stories | Total SP | Sprint |
|------|---------|----------|--------|
| Epic 1 | 5 | 32 | Sprint 1 |
| Epic 2 | 7 | 55 | Sprint 2 |
| Epic 3 | 5 | 34 | Sprint 3 |
| Epic 4 | 6 | 31 | Sprint 3 |
| Epic 5 | 5 | 37 | Sprint 4 |
| Epic 6 | 6 | 52 | Sprint 5 |
| Epic 7 | 4 | 42 | Sprint 6 |
| **Total** | **38** | **283** | **6 sprints** |

---

## Next Steps

1. **Immediate**: Start Phase 0 Technical Validation
2. **Day 3**: GO/NO-GO decision meeting
3. **Week 1**: Sprint 1 Planning
4. **Week 9**: MVP Release preparation

---

_Sprint Plan created by Winston (BMAD Architect)_
_Date: 09/12/2025_
