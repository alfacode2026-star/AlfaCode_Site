-- ============================================
-- MIGRATION: Add completion_percentage to payments table
-- ============================================
-- This migration adds the completion_percentage field to the payments table
-- This field is used for milestone advances (سلفة مرحلة) to track project completion percentage
-- 
-- Usage: Run this SQL script in your Supabase SQL editor or database console

-- Add completion_percentage column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5, 2) CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Add index for completion_percentage for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_payments_completion_percentage ON payments(completion_percentage);

-- Add comment to document the field
COMMENT ON COLUMN payments.completion_percentage IS 'نسبة الإنجاز السابقة - Previous Completion Percentage for milestone advances (سلفة مرحلة)';
