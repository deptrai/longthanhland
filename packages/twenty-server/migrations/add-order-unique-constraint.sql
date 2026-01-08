-- Migration: Add unique constraint to Order.transactionHash
-- Purpose: Prevent race conditions in banking webhook idempotency check
-- Run this in your Twenty PostgreSQL database

-- Check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_order_transaction_hash'
    ) THEN
        -- Add unique constraint (allows multiple NULLs since it's partial)
        ALTER TABLE "_3b8e64585fc14e638563008ccdaa6db"."order"
        ADD CONSTRAINT unique_order_transaction_hash 
        UNIQUE (transactionHash);
        
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Constraint already exists';
    END IF;
END $$;

-- Alternative: Create unique index (allows multiple NULL values)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_order_transaction_hash_unique 
-- ON "_3b8e64585fc14e638563008ccdaa6db"."order" (transactionHash) 
-- WHERE transactionHash IS NOT NULL;
