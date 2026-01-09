-- ============================================
-- MIGRATION: Add Income/Expense Type and Project Fields to Payments
-- ============================================
-- This migration adds support for tracking income (client payments) vs expenses (supplier payments)
-- and links payments directly to projects and work scopes

-- Add type field to distinguish income (client payments) from expenses (supplier payments)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('income', 'expense')) DEFAULT 'expense';

-- Add project_id to link payments directly to projects
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS project_id TEXT;

-- Add work_scope to track which work scope the payment relates to
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS work_scope TEXT;

-- Add index for project_id for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments(project_id);

-- Add index for payment_type for filtering
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);

-- Add index for work_scope
CREATE INDEX IF NOT EXISTS idx_payments_work_scope ON payments(work_scope);

-- Update existing payments: if they have a contract_id, mark as 'income' (client payments)
-- If contract_id is null or unclear, keep as 'expense' (default)
UPDATE payments 
SET payment_type = 'income' 
WHERE contract_id IS NOT NULL AND payment_type = 'expense';

-- Add comment to document the field
COMMENT ON COLUMN payments.payment_type IS 'income: payments received from clients (invoices/milestones), expense: payments made to suppliers';
COMMENT ON COLUMN payments.project_id IS 'Direct link to project for tracking project-specific income/expenses';
COMMENT ON COLUMN payments.work_scope IS 'Work scope this payment relates to (e.g., civil_works, mep, etc.)';
