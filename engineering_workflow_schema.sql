-- ============================================
-- ENGINEERING WORKFLOW SCHEMA
-- Quotations, Contracts, and Payments Tables
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- QUOTATIONS TABLE (عروض الأسعار)
-- ============================================
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  quote_number TEXT NOT NULL UNIQUE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  work_type TEXT NOT NULL CHECK (work_type IN ('civil_works', 'finishing', 'mep', 'low_current', 'infrastructure', 'special')),
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')) DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for quotations
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_id ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_quote_number ON quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_work_type ON quotations(work_type);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);

-- ============================================
-- CONTRACTS TABLE (العقود)
-- Replacing Orders for Engineering Workflow
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  contract_number TEXT NOT NULL UNIQUE,
  quotation_id TEXT REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('original', 'amendment')) DEFAULT 'original',
  original_contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL, -- For amendments
  work_type TEXT NOT NULL CHECK (work_type IN ('civil_works', 'finishing', 'mep', 'low_current', 'infrastructure', 'special')),
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'on_hold', 'fully_completed')) DEFAULT 'in_progress',
  start_date DATE,
  end_date DATE,
  project_id TEXT, -- Link to projects if needed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_quotation_id ON contracts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_work_type ON contracts(work_type);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- ============================================
-- CONTRACT ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contract_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for contract_items
CREATE INDEX IF NOT EXISTS idx_contract_items_contract_id ON contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_created_at ON contract_items(created_at);

-- ============================================
-- PAYMENTS TABLE (الدفعات)
-- Installments linked to Contracts
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'other')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for quotations updated_at
DROP TRIGGER IF EXISTS update_quotations_updated_at ON quotations;
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for contracts updated_at
DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payments updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for quotations
CREATE POLICY "Allow all operations for authenticated users" ON quotations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for contracts
CREATE POLICY "Allow all operations for authenticated users" ON contracts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for contract_items
CREATE POLICY "Allow all operations for authenticated users" ON contract_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for payments
CREATE POLICY "Allow all operations for authenticated users" ON payments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE quotations IS 'عروض الأسعار - Quotations for engineering projects';
COMMENT ON TABLE contracts IS 'العقود - Contracts derived from accepted quotations';
COMMENT ON TABLE contract_items IS 'بنود العقد - Items/services within each contract';
COMMENT ON TABLE payments IS 'الدفعات - Payment installments linked to contracts';
