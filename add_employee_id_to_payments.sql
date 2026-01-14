-- ============================================
-- MIGRATION: Add employee_id to payments table
-- ============================================
-- This migration adds employee_id column to payments table
-- to enable relational linking between expenses and employees

-- Add employee_id column (nullable, foreign key to employees table)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Add index for employee_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON payments(employee_id);

-- Add comment to document the field
COMMENT ON COLUMN payments.employee_id IS 'Employee ID - Links to employees table for internal recipients. NULL for external recipients.';

-- Note: For existing records, employee_id will be NULL
-- The application will populate it when expenses are edited or new ones are created
