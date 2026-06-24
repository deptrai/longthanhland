# Story 6.6: Manual Override

Status: drafted

## Story

As an **Admin**,
I want to manually reassign leads,
so that I can handle special cases.

## Acceptance Criteria

1. **AC-6.6.1**: Given Admin, When reassigns lead, Then new agent assigned
2. **AC-6.6.2**: Given reassignment, Then old agent's activeLeadCount decremented

## Tasks / Subtasks

- [ ] Task 1: Implement reassignLead (AC: 1, 2)
  - [ ] Update lead.assignedSalesId
  - [ ] Update both agents' activeLeadCount

## Dev Notes

### References
- [Source: tech-spec-epic-6.md#Lead-Assignment-Service]

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)
