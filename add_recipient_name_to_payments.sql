-- ============================================
-- MIGRATION: Add recipient_name to payments table
-- ============================================
-- This migration adds the recipient_name field to the payments table
-- This field is important for printing payment vouchers (سند صرف) later
-- 
-- Usage: Run this SQL script in your Supabase SQL editor or database console

-- Add recipient_name column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- Add index for recipient_name for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_payments_recipient_name ON payments(recipient_name);

-- Add comment to document the field
COMMENT ON COLUMN payments.recipient_name IS 'اسم المستلم - Recipient Name for printing payment vouchers (سند صرف)';
