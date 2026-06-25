import { validateEnv, envSchema } from './env.validation';

describe('validateEnv (AC2 — fail-fast config)', () => {
  const validConfig = {
    DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54352/postgres',
    SUPABASE_URL: 'http://127.0.0.1:54351',
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  };

  it('parse thành công khi đủ biến bắt buộc + áp default', () => {
    const env = validateEnv(validConfig);
    expect(env.DATABASE_URL).toBe(validConfig.DATABASE_URL);
    expect(env.SUPABASE_URL).toBe(validConfig.SUPABASE_URL);
    // default
    expect(env.SUPABASE_STORAGE_BUCKET).toBe('listings');
    expect(env.API_PORT).toBe(3101);
    expect(env.DB_POOL_MAX).toBe(10);
    expect(env.DB_IDLE_TIMEOUT).toBe(20);
  });

  it('coerce kiểu số cho API_PORT/DB_POOL_MAX từ string env', () => {
    const env = validateEnv({ ...validConfig, API_PORT: '4000', DB_POOL_MAX: '5' });
    expect(env.API_PORT).toBe(4000);
    expect(env.DB_POOL_MAX).toBe(5);
  });

  it.each([
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])('throw khi thiếu biến bắt buộc: %s', (key) => {
    const broken: Record<string, unknown> = { ...validConfig };
    delete broken[key];
    expect(() => validateEnv(broken)).toThrow(/Cấu hình môi trường không hợp lệ/);
    expect(() => validateEnv(broken)).toThrow(new RegExp(key));
  });

  it('throw khi DATABASE_URL sai scheme (không phải postgres)', () => {
    expect(() =>
      validateEnv({ ...validConfig, DATABASE_URL: 'mysql://x' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('throw khi SUPABASE_URL không phải URL', () => {
    expect(() =>
      validateEnv({ ...validConfig, SUPABASE_URL: 'not-a-url' }),
    ).toThrow(/SUPABASE_URL/);
  });

  it('thông báo lỗi KHÔNG chứa giá trị secret (AD-8)', () => {
    try {
      validateEnv({ ...validConfig, SUPABASE_URL: 'bad' });
      fail('expected throw');
    } catch (e) {
      const msg = (e as Error).message;
      // KHÔNG lộ service-role key trong message
      expect(msg).not.toContain('service-role-key');
      expect(msg).not.toContain('anon-key');
    }
  });

  it('envSchema export được để tái dùng', () => {
    expect(envSchema.safeParse(validConfig).success).toBe(true);
  });
});
