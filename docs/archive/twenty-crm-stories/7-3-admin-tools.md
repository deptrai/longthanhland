# Story 7.3: Admin Tools

Status: drafted

## Story

As an **Admin**,
I want admin tools,
so that I can manage users and troubleshoot issues.

## Acceptance Criteria

1. **AC-7.3.1**: Given Admin, When impersonates user, Then can see their view
2. **AC-7.3.2**: Given impersonation, Then logged in audit trail
3. **AC-7.3.3**: Given impersonation, Then expires after 1 hour
4. **AC-7.3.4**: Given system health dashboard, Then shows all services status

## Tasks / Subtasks

- [ ] Task 1: Create AdminToolsService (AC: 1-3)
  - [ ] Implement impersonateUser
  - [ ] Add audit logging
  - [ ] Set 1 hour expiry
- [ ] Task 2: System health (AC: 4)
  - [ ] Implement getSystemHealth

## Dev Notes

### References
- [Source: tech-spec-epic-7.md#Admin-Tools]

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)
