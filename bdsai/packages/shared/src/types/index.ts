// @bdsai/shared — types dùng chung FE ↔ BE.
// Story 1.1: chỉ 1 type mẫu để chứng minh chia sẻ type. Mở rộng ở các story sau.

/**
 * Vai trò người dùng trong hệ thống bdsai.vn.
 * String literal union (theo AD convention: ưu tiên string literal hơn enum).
 */
export type Role = 'user' | 'admin';
