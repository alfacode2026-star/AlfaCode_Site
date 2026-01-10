-- ============================================
-- MIGRATION: Add remaining_amount and settlement status support
-- ============================================
-- This migration adds remaining_amount tracking for manager advances
-- and adds 'settled' and 'partially_settled' status values

-- Add remaining_amount column (NULL for non-advance payments)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(15, 2);

-- Update existing advances: set remaining_amount = amount for all existing advances
UPDATE payments 
SET remaining_amount = amount 
WHERE transaction_type = 'advance' AND remaining_amount IS NULL;

-- Drop old status constraint if it exists
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
      AND pg_get_constraintdef(oid) LIKE '%CHECK%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Add new status constraint with 'settled' and 'partially_settled'
ALTER TABLE payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'approved', 'rejected', 'settled', 'partially_settled'));

-- Add index for remaining_amount for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_remaining_amount ON payments(remaining_amount) 
WHERE remaining_amount IS NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN payments.remaining_amount IS 'Remaining amount for manager advances - used to track partial settlements. NULL for non-advance payments.';

-- Update payment_method constraint to include 'settlement'
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%payment_method%'
      AND pg_get_constraintdef(oid) LIKE '%CHECK%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Add new payment_method constraint with 'settlement' option
ALTER TABLE payments 
ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'check', 'other', 'credit_card', 'settlement'));
