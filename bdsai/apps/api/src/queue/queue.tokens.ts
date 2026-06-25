/**
 * Queue DI tokens (Story 1.6 AC2, AD-1) — Story 1.6.
 *
 * BullMQ Queue được inject qua `@InjectQueue(ECHO_QUEUE)` (nestjs/bullmq).
 * Redis connection (ioredis) dùng chung cho Queue + Worker + healthcheck —
 * inject qua REDIS_CONNECTION token.
 */

// Tên queue test (echo job) — dùng chung cho Queue + Worker (BullMQ match theo tên).
// BullMQ 5 KHÔNG cho phép ':' trong queue name → dùng kebab-case.
export const ECHO_QUEUE = 'bdsai-echo';

// DI token cho Redis connection (ioredis) — dùng chung cho BullMQ + healthcheck ping.
export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

/**
 * Payload test job "echo" (AC2) — processor nhận + echo lại log.
 * Đặt ở tokens (không phải service) để processor import không tạo circular dep.
 */
export interface EchoJobData {
  message: string;
}
