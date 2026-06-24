# Story 6.4: Notification System

Status: drafted

## Story

As a **Sales Agent**,
I want notifications when leads are assigned,
so that I can respond quickly.

## Acceptance Criteria

1. **AC-6.4.1**: Given lead assigned, Then email sent to agent
2. **AC-6.4.2**: Given agent has zaloId, Then Zalo message sent
3. **AC-6.4.3**: Given SLA breach, Then notification sent to agent and manager

## Tasks / Subtasks

- [ ] Task 1: Create NotificationService (AC: 1-3)
  - [ ] Implement sendLeadAssigned
  - [ ] Implement sendSlaAtRisk
  - [ ] Implement sendSlaBreached

## Dev Notes

### References
- [Source: tech-spec-epic-6.md#Notification-Service]

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)
