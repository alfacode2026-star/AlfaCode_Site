-- ============================================
-- MIGRATION: Add Accounting Hub Features
-- ============================================
-- This migration adds support for:
-- 1. Dynamic expense categories
-- 2. Recurring expense setup (Payment Frequency)
-- 3. Petty Cash Management (نظام العُهد)
-- 4. Manager tracking for petty cash

-- ============================================
-- EXPENSE CATEGORIES TABLE (Dynamic Categories)
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT, -- Arabic name
  type TEXT NOT NULL CHECK (type IN ('administrative', 'project')) DEFAULT 'administrative',
  is_system BOOLEAN NOT NULL DEFAULT false, -- System categories cannot be deleted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user',
  UNIQUE(tenant_id, name, type)
);

-- Indexes for expense_categories
CREATE INDEX IF NOT EXISTS idx_expense_categories_tenant_id ON expense_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_type ON expense_categories(type);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON expense_categories(name);

-- Insert default administrative categories
INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Rent',
  'إيجار',
  'administrative',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Salaries',
  'رواتب',
  'administrative',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Electricity',
  'كهرباء',
  'administrative',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Internet',
  'إنترنت',
  'administrative',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Marketing',
  'تسويق',
  'administrative',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Maintenance',
  'صيانة',
  'administrative',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Other',
  'أخرى',
  'administrative',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

-- Insert default project categories
INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Materials',
  'مواد',
  'project',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Labor',
  'عمال',
  'project',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Equipment',
  'معدات',
  'project',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Sub-contractors',
  'مقاولين فرعيين',
  'project',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Permits',
  'تصاريح',
  'project',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Site Utilities',
  'مرافق الموقع',
  'project',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

INSERT INTO expense_categories (tenant_id, name, name_ar, type, is_system, created_by)
SELECT 
  t.id,
  'Other',
  'أخرى',
  'project',
  true,
  'system'
FROM (SELECT DISTINCT tenant_id as id FROM payments WHERE tenant_id IS NOT NULL) t
ON CONFLICT DO NOTHING;

-- ============================================
-- UPDATE PAYMENTS TABLE
-- ============================================

-- Add payment_frequency field (دورية الصرف)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_frequency TEXT CHECK (payment_frequency IN ('one-time', 'monthly', 'yearly')) DEFAULT 'one-time';

-- Add transaction_type field for Petty Cash Management
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS transaction_type TEXT CHECK (transaction_type IN ('regular', 'advance', 'settlement')) DEFAULT 'regular';

-- Add manager_name field for tracking who is responsible for petty cash
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS manager_name TEXT;

-- Add linked_advance_id to link settlements to advance records
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS linked_advance_id TEXT REFERENCES payments(id) ON DELETE SET NULL;

-- Remove the old expense_category CHECK constraint to allow dynamic categories
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find and drop the existing expense_category constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'payments'::regclass
    AND contype = 'c'
    AND (pg_get_constraintdef(oid) LIKE '%expense_category%' OR pg_get_constraintdef(oid) LIKE '%expense_category IN%');
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

-- Change expense_category to TEXT (no longer constrained to specific values)
-- It's already TEXT, so we just need to ensure it can be nullable
ALTER TABLE payments 
ALTER COLUMN expense_category DROP NOT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_payments_payment_frequency ON payments(payment_frequency);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_type ON payments(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_manager_name ON payments(manager_name);
CREATE INDEX IF NOT EXISTS idx_payments_linked_advance_id ON payments(linked_advance_id);

-- Add trigger for expense_categories updated_at
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for expense_categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Policy for expense_categories
CREATE POLICY "Allow all operations for authenticated users" ON expense_categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE expense_categories IS 'Dynamic expense categories that can be added by users';
COMMENT ON COLUMN payments.payment_frequency IS 'Payment frequency: one-time (لمرة واحدة), monthly (شهري), yearly (سنوي)';
COMMENT ON COLUMN payments.transaction_type IS 'Transaction type: regular (regular expense), advance (عهدة - cash issued to manager), settlement (تسوية - invoices linked to advance)';
COMMENT ON COLUMN payments.manager_name IS 'Manager name for petty cash tracking (عُهد مديري المشاريع)';
COMMENT ON COLUMN payments.linked_advance_id IS 'Links settlement transactions to their original advance record';
