import { Inject } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

/** DI token cho Supabase server-side client (service-role) — AD-1. */
export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

/** Decorator tiện dụng để inject Supabase client. */
export const InjectSupabase = (): ParameterDecorator => Inject(SUPABASE_CLIENT);

export type { SupabaseClient };
