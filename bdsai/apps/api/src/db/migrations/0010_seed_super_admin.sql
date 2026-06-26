-- Story 2.5: seed super-admin đầu tiên.
-- Chạy thủ công sau khi tạo user đầu tiên qua UI register.
-- Cập nhật email dưới đây thành email của super-admin mong muốn.
-- KHÔNG chạy qua UI công khai — chỉ DB admin chạy script này.

-- Cách dùng:
--   1. Register user qua UI /register (email + phone + password).
--   2. Tìm user id: SELECT id, email FROM public_users WHERE email = 'admin@bdsai.vn';
--   3. Update role:
UPDATE public_users
SET role = 'super-admin', updated_at = now()
WHERE email = 'admin@bdsai.vn'
  AND (SELECT pg_get_userbyid(c.relowner) FROM pg_class c WHERE c.relname = 'public_users') IS NOT NULL;
--   4. Verify: SELECT id, email, role FROM public_users WHERE role = 'super-admin';
