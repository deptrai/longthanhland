/**
 * Drizzle schema barrel — Story 1.2.
 *
 * ⚠️ CỐ Ý RỖNG (AC4): Story 1.2 KHÔNG tạo bảng nghiệp vụ nào.
 * Các bảng sẽ được thêm ở story sau:
 *   - public_users   → Story 2.1
 *   - public_listings → Story 3.1
 *   - inquiries / cross_posts / ai_results / imported_listings → story tương ứng
 *
 * Khi có bảng đầu tiên, export schema tại đây để drizzle-kit nhận diện
 * (drizzle.config.ts trỏ schema: './src/db/schema/*').
 *
 * NOTE (LOW-5): Vì schema rỗng, `drizzle-kit generate` in
 * "No schema changes, nothing to migrate" và KHÔNG tạo file SQL nào;
 * `migrations/meta/_journal.json` có `entries: []`. Tuy nhiên `db:migrate`
 * vẫn kết nối + tạo bảng `drizzle.__drizzle_migrations` (metadata) → AC1 thỏa.
 * File migration 0000 đầu tiên sẽ sinh khi Story 2.1 thêm bảng public_users.
 */
export {};
