import { Inject } from '@nestjs/common';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';

/** DI token cho Drizzle DB instance (AD-1: inject qua token, không truy cập client trực tiếp). */
export const DRIZZLE = Symbol('DRIZZLE');

/** DI token cho postgres.js client thô — dùng cho health SELECT 1 + đóng connection. */
export const PG_CLIENT = Symbol('PG_CLIENT');

/** Kiểu Drizzle DB cho story này — schema rỗng (AC4), mở rộng khi có bảng. */
export type DrizzleDB = PostgresJsDatabase<Record<string, never>>;

/** Decorator tiện dụng để inject Drizzle DB. */
export const InjectDrizzle = (): ParameterDecorator => Inject(DRIZZLE);

/** Decorator tiện dụng để inject postgres.js client thô. */
export const InjectPgClient = (): ParameterDecorator => Inject(PG_CLIENT);

export type { Sql, PostgresJsDatabase };
