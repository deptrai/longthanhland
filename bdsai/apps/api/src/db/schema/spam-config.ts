import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { publicUsers } from './public-users';

// Story 4.3 — spam_keywords table (admin configurable blacklist).
export const spamKeywords = pgTable('spam_keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyword: text('keyword').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => publicUsers.id, { onDelete: 'set null' }),
});

// Story 4.3 — spam_config table (heuristic thresholds).
export const spamConfig = pgTable('spam_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => publicUsers.id, { onDelete: 'set null' }),
});
