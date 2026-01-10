-- ============================================
-- MIGRATION: Add General Expenses Support
-- ============================================
-- This migration adds support for general expenses (المصاريف العامة)
-- which are company-wide expenses not linked to specific projects

-- Make contract_id nullable for general expenses
ALTER TABLE payments 
ALTER COLUMN contract_id DROP NOT NULL;

-- Add category field for general expenses
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS expense_category TEXT CHECK (expense_category IN ('Office Rent', 'Salaries', 'Marketing', 'Utilities', 'Supplies', 'Other'));

-- Add index for expense_category for filtering
CREATE INDEX IF NOT EXISTS idx_payments_expense_category ON payments(expense_category);

-- Add comment to document the fields
COMMENT ON COLUMN payments.contract_id IS 'Contract ID - NULL for general expenses, required for project-related payments';
COMMENT ON COLUMN payments.expense_category IS 'Category for general expenses: Office Rent, Salaries, Marketing, Utilities, Supplies, Other';

-- Update constraint: contract_id can be NULL only if payment_type is 'expense' and it's a general expense
-- Note: This is handled at application level for flexibility
