import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { publicUsers } from './public-users';

// Story 2.4 + 2.5 — user action audit log table.
// Persistent record cho ban/unban/role-grant/role-revoke.
export const userAuditLogs = pgTable(
  'user_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => publicUsers.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id')
      .notNull()
      .references(() => publicUsers.id, { onDelete: 'cascade' }),
    action: text('action').notNull(), // 'ban' | 'unban' | 'role_grant' | 'role_revoke'
    detail: text('detail'), // reason hoặc new role
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_user_audit_admin').on(table.adminId),
    index('idx_user_audit_target').on(table.targetId),
    index('idx_user_audit_created').on(table.createdAt),
  ],
);
