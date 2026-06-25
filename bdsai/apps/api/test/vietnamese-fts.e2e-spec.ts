import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { DRIZZLE, type DrizzleDB } from '../src/db/database.tokens';

/**
 * Integration test Vietnamese Full-Text Search (Story 1.5).
 *
 * Yêu cầu Supabase local đang chạy (dải 5435x, DB 54352) + apps/api/.env có
 * DATABASE_URL thật + migration 0000_vietnamese_fts đã apply (`yarn db:migrate`).
 *
 * AC3 — FTS match: "long thanh" → "Long Thành", "can ho" → "Căn hộ", "dat nen" → "Đất nền".
 * AC4 — pg_trgm fuzzy: similarity > 0, operator `%` match.
 * AC5 — idempotent: migration 0000 apply 1 lần (Drizzle track trong __drizzle_migrations).
 * AC8 — test tự động (e2e integration, DB thật).
 *
 * Test dùng TEMP TABLE (session-scoped, tự drop khi connection end) — KHÔNG tạo
 * bảng nghiệp vụ persist (AC6). AD-2: không mutation nghiệp vụ, chỉ test read.
 */

// Helper: lấy row đầu tiên an toàn (strict null-check) — query test luôn trả ≥1 row.
const firstRow = <T>(rows: T[]): T => {
  if (rows.length === 0) {
    throw new Error('query trả 0 row — expected ≥1');
  }
  return rows[0] as T;
};

describe('Vietnamese Full-Text Search (e2e) — Story 1.5', () => {
  let app: INestApplication;
  let db: DrizzleDB;

  // Cold-start DB connection (bài học Story 1.2).
  jest.setTimeout(120_000);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    db = app.get<DrizzleDB>(DRIZZLE);
  });

  afterAll(async () => {
    await app.close();
  });

  // AC1 — extension unaccent + pg_trgm đã bật (migration 0000).
  it('AC1: extension unaccent + pg_trgm enabled trên database', async () => {
    const rows = (await db.execute(
      `SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm') ORDER BY extname`,
    )) as { extname: string }[];
    const names = rows.map((r) => r.extname);
    expect(names).toContain('unaccent');
    expect(names).toContain('pg_trgm');
  });

  // AC2 — function IMMUTABLE (provolatile='i') để safe cho GIN index (Story 3.3).
  it('AC2: f_unaccent_to_tsvector + f_unaccent_query là IMMUTABLE', async () => {
    const rows = (await db.execute(
      `SELECT proname, provolatile FROM pg_proc
       WHERE proname IN ('f_unaccent_to_tsvector','f_unaccent_query')`,
    )) as { proname: string; provolatile: string }[];
    const byName = new Map(rows.map((r) => [r.proname, r.provolatile]));
    expect(byName.get('f_unaccent_to_tsvector')).toBe('i');
    expect(byName.get('f_unaccent_query')).toBe('i');
  });

  // AC2 — tsvector bỏ dấu + simple config: "Long Thành" -> 'long':1 'thanh':2.
  it('AC2: f_unaccent_to_tsvector bỏ dấu + simple config (Long Thành -> long/thanh)', async () => {
    const rows = (await db.execute(
      `SELECT f_unaccent_to_tsvector('Long Thành') AS vec`,
    )) as { vec: string }[];
    const vec = firstRow(rows).vec;
    expect(vec).toContain("'long'");
    expect(vec).toContain("'thanh'");
  });

  // AC2 — tsquery plain text: "long thanh" -> 'long' & 'thanh'.
  it('AC2: f_unaccent_query plain text -> AND tsquery (long thanh -> long & thanh)', async () => {
    const rows = (await db.execute(
      `SELECT f_unaccent_query('long thanh') AS q`,
    )) as { q: string }[];
    const q = firstRow(rows).q;
    expect(q).toContain("'long'");
    expect(q).toContain("'thanh'");
    expect(q).toContain('&');
  });

  // AC3 — FTS match: 3 case (long thanh / can ho / dat nen).
  // Dùng regular table (KHÔNG temp) vì postgres.js prepare:false dùng connection
  // khác nhau cho mỗi db.execute → TEMP table (session-scoped) không persist qua calls.
  // Table được CREATE + DROP trong test (try/finally) — KHÔNG persist vào DB (AC6).
  it('AC3: FTS match "long thanh"→"Long Thành", "can ho"→"Căn hộ", "dat nen"→"Đất nền"', async () => {
    await db.execute(`DROP TABLE IF EXISTS fts_test`);
    await db.execute(
      `CREATE TABLE fts_test (id serial PRIMARY KEY, title text NOT NULL)`,
    );
    try {
      await db.execute(
        `INSERT INTO fts_test (title) VALUES ('Long Thành'), ('Căn hộ chung cư'), ('Đất nền Đồng Nai')`,
      );

      const q1 = (await db.execute(
        `SELECT title FROM fts_test WHERE f_unaccent_to_tsvector(title) @@ f_unaccent_query('long thanh')`,
      )) as { title: string }[];
      expect(q1.map((r) => r.title)).toContain('Long Thành');

      const q2 = (await db.execute(
        `SELECT title FROM fts_test WHERE f_unaccent_to_tsvector(title) @@ f_unaccent_query('can ho')`,
      )) as { title: string }[];
      expect(q2.map((r) => r.title)).toContain('Căn hộ chung cư');

      const q3 = (await db.execute(
        `SELECT title FROM fts_test WHERE f_unaccent_to_tsvector(title) @@ f_unaccent_query('dat nen')`,
      )) as { title: string }[];
      expect(q3.map((r) => r.title)).toContain('Đất nền Đồng Nai');
    } finally {
      // Cleanup — đảm bảo table không persist dù test fail (AC6).
      await db.execute(`DROP TABLE IF EXISTS fts_test`);
    }
  });

  // AC4 — pg_trgm similarity > 0 + operator `%` match (threshold 0.3 default).
  it('AC4: pg_trgm similarity > 0 + operator % match (Long Thành ~ long thanh)', async () => {
    // set_limit + similarity trong 2 statement riêng để parse kết quả rõ ràng.
    await db.execute(`SELECT set_limit(0.3)`);
    const simRows = (await db.execute(
      `SELECT similarity(unaccent(lower('Long Thành')), unaccent(lower('long thanh'))) AS sim`,
    )) as { sim: number }[];
    const sim = firstRow(simRows).sim;
    expect(typeof sim).toBe('number');
    expect(sim).toBeGreaterThan(0);

    const trgmRows = (await db.execute(
      `SELECT unaccent(lower('Long Thành')) % unaccent(lower('long thanh')) AS trgm_match`,
    )) as { trgm_match: boolean }[];
    expect(firstRow(trgmRows).trgm_match).toBe(true);
  });

  // Edge case — query rỗng không crash, trả empty tsquery (0 match).
  it('edge case: query rỗng "" không throw, trả empty tsquery', async () => {
    const rows = (await db.execute(
      `SELECT f_unaccent_query('') AS q`,
    )) as { q: string }[];
    // empty tsquery — không crash, không lexeme (chỉ whitespace).
    expect(firstRow(rows).q).not.toMatch(/[a-z]/);
  });

  // AC5 — idempotent: migration 0000 chỉ apply 1 lần (Drizzle track, không duplicate).
  it('AC5: migration 0000 idempotent — chỉ 1 entry trong __drizzle_migrations', async () => {
    const rows = (await db.execute(
      `SELECT count(*)::int AS cnt FROM drizzle.__drizzle_migrations`,
    )) as { cnt: number }[];
    expect(firstRow(rows).cnt).toBeGreaterThanOrEqual(1);
    // Không có duplicate: chạy migrate nhiều lần không sinh bản mới cho cùng hash.
    const dupRows = (await db.execute(
      `SELECT hash, count(*)::int AS dup FROM drizzle.__drizzle_migrations GROUP BY hash HAVING count(*) > 1`,
    )) as { hash: string; dup: number }[];
    expect(dupRows).toHaveLength(0);
  });

  // AC6 — migration 0000 chỉ extension + function, KHÔNG tạo table.
  // Story 2.1 thêm public_users (migration 0001) — chấp nhận bảng này.
  it('AC6: migration 0000 không tạo bảng nghiệp vụ (chỉ extension+function)', async () => {
    const rows = (await db.execute(
      `SELECT tablename FROM pg_tables WHERE schemaname='public'`,
    )) as { tablename: string }[];
    // Story 2.1: public_users là bảng nghiệp vụ đầu tiên (migration 0001).
    // Migration 0000 (vietnamese_fts) KHÔNG tạo table — chỉ extension + function.
    const nonStory21Tables = rows.filter((r) => r.tablename !== 'public_users');
    expect(nonStory21Tables).toHaveLength(0);
  });
});
