-- ============================================
-- LABOR & STAFF MANAGEMENT SCHEMA
-- Internal Staff (الموظفون) and External Labor Groups (العمالة الخارجية)
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EMPLOYEES TABLE (الموظفون - Internal Staff)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  employee_id TEXT NOT NULL, -- الرقم الوظيفي
  job_title TEXT NOT NULL, -- المسمى الوظيفي
  monthly_salary DECIMAL(15, 2) NOT NULL DEFAULT 0, -- الراتب الأساسي
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user',
  UNIQUE(tenant_id, employee_id)
);

-- Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

-- ============================================
-- LABOR GROUPS TABLE (العمالة الخارجية - External Labor Groups)
-- ============================================
CREATE TABLE IF NOT EXISTS labor_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  engineer_id TEXT, -- ID of the engineer who created this group (can be user ID or name)
  engineer_name TEXT, -- Name of the engineer for display
  start_date DATE NOT NULL,
  end_date DATE, -- Set when closing the group
  normal_count INTEGER NOT NULL DEFAULT 0, -- Number of normal laborers (عمالة عادية)
  skilled_count INTEGER NOT NULL DEFAULT 0, -- Number of skilled laborers (عمالة خلفة/مساعدة)
  normal_rate DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Daily rate for normal laborers
  skilled_rate DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Daily rate for skilled laborers
  holidays TEXT[], -- Array of holiday day names (e.g., ['Friday', 'Saturday', 'Sunday'])
  net_days INTEGER, -- Calculated net days (excluding holidays)
  overtime DECIMAL(15, 2) DEFAULT 0, -- إضافي/مكافأة (adds to total)
  deductions DECIMAL(15, 2) DEFAULT 0, -- خصومات (subtracts from total)
  deduction_reason TEXT, -- Reason for deductions (mandatory if deductions > 0)
  total_amount DECIMAL(15, 2) DEFAULT 0, -- Final calculated total
  status TEXT NOT NULL CHECK (status IN ('active', 'pending_approval', 'approved', 'paid', 'cancelled')) DEFAULT 'active',
  payment_method TEXT CHECK (payment_method IN ('treasury', 'advance')), -- How payment was made
  linked_advance_id TEXT REFERENCES payments(id) ON DELETE SET NULL, -- If paid from advance
  treasury_account_id TEXT, -- Treasury account used for payment (if payment_method = 'treasury')
  approved_by TEXT, -- User who approved the payment
  approved_at TIMESTAMP WITH TIME ZONE, -- When payment was approved
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for labor_groups
CREATE INDEX IF NOT EXISTS idx_labor_groups_tenant_id ON labor_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_labor_groups_project_id ON labor_groups(project_id);
CREATE INDEX IF NOT EXISTS idx_labor_groups_engineer_id ON labor_groups(engineer_id);
CREATE INDEX IF NOT EXISTS idx_labor_groups_status ON labor_groups(status);
CREATE INDEX IF NOT EXISTS idx_labor_groups_start_date ON labor_groups(start_date);
CREATE INDEX IF NOT EXISTS idx_labor_groups_created_at ON labor_groups(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for employees updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for labor_groups updated_at
DROP TRIGGER IF EXISTS update_labor_groups_updated_at ON labor_groups;
CREATE TRIGGER update_labor_groups_updated_at
  BEFORE UPDATE ON labor_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_groups ENABLE ROW LEVEL SECURITY;

-- Policies for employees
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON employees;
CREATE POLICY "Allow all operations for authenticated users" ON employees
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for labor_groups
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON labor_groups;
CREATE POLICY "Allow all operations for authenticated users" ON labor_groups
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE employees IS 'Internal staff employees (الموظفون)';
COMMENT ON TABLE labor_groups IS 'External labor groups (العمالة الخارجية) managed by engineers';
COMMENT ON COLUMN labor_groups.holidays IS 'Array of holiday day names to exclude from calculations (e.g., Friday, Saturday, Sunday)';
COMMENT ON COLUMN labor_groups.net_days IS 'Calculated working days excluding holidays';
COMMENT ON COLUMN labor_groups.overtime IS 'Overtime/bonus amount that adds to total (إضافي/مكافأة)';
COMMENT ON COLUMN labor_groups.deductions IS 'Deductions amount that subtracts from total (خصومات)';
COMMENT ON COLUMN labor_groups.deduction_reason IS 'Mandatory reason for deductions';
COMMENT ON COLUMN labor_groups.status IS 'active: group is open, pending_approval: closed and waiting approval, approved: approved for payment, paid: payment completed';
COMMENT ON COLUMN labor_groups.payment_method IS 'treasury: paid from treasury/bank, advance: deducted from engineer advance';
