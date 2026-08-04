-- Story 5.3: Add 'assisted' status to cross_post_status enum.
-- Chợ Tốt MVP: provider returns assisted result → seller manually posts → PATCH confirm.
-- Idempotent: ALTER TYPE ... ADD VALUE không re-run được trong transaction block,
-- nhưng psql -f chạy ngoài transaction → OK. IF NOT EXISTS không support cho ADD VALUE
-- (PG < 12), dùng DO block check pg_enum trước.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'cross_post_status' AND e.enumlabel = 'assisted'
  ) THEN
    ALTER TYPE cross_post_status ADD VALUE 'assisted' BEFORE 'failed';
  END IF;
END $$;
