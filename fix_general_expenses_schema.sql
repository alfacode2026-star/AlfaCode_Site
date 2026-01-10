-- ============================================
-- FIX: General Expenses - Make payment_frequency and expense_category nullable for project expenses
-- ============================================
-- This migration ensures that payment_frequency and expense_category are optional (nullable)
-- for project expenses, preventing NULL constraint errors

-- Make payment_frequency nullable (it's already nullable but ensure it's explicitly set)
ALTER TABLE payments 
ALTER COLUMN payment_frequency DROP NOT NULL;

-- Remove default constraint if it exists and allow NULL
-- Note: We keep the default for backward compatibility, but allow NULL values
DO $$ 
BEGIN
  -- Remove default if it exists, but we'll keep it for new records
  -- The column can now accept NULL for project expenses
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'payment_frequency' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE payments ALTER COLUMN payment_frequency DROP NOT NULL;
  END IF;
END $$;

-- Ensure expense_category is nullable (it should already be nullable from previous migrations)
ALTER TABLE payments 
ALTER COLUMN expense_category DROP NOT NULL;

-- Add comment to clarify the nullable fields for project expenses
COMMENT ON COLUMN payments.payment_frequency IS 'Payment frequency: one-time (لمرة واحدة), monthly (شهري), yearly (سنوي). NULL for project-related expenses (orders)';
COMMENT ON COLUMN payments.expense_category IS 'Category for administrative expenses. NULL for project-related expenses (orders)';

-- Update the CHECK constraint for payment_frequency to allow NULL
-- First, drop the existing constraint if it exists
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find and drop the existing payment_frequency constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'payments'::regclass
    AND contype = 'c'
    AND (pg_get_constraintdef(oid) LIKE '%payment_frequency%' OR pg_get_constraintdef(oid) LIKE '%payment_frequency IN%');
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- Recreate the constraint to allow NULL values
ALTER TABLE payments 
ADD CONSTRAINT check_payment_frequency 
CHECK (payment_frequency IS NULL OR payment_frequency IN ('one-time', 'monthly', 'yearly'));
