-- ============================================
-- LABOR SYSTEM SCHEMA
-- Workers and Daily Attendance Records
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- WORKERS TABLE (العمال)
-- ============================================
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trade TEXT NOT NULL, -- e.g., Mason, Electrician, Plumber, etc.
  default_daily_rate DECIMAL(15, 2) NOT NULL DEFAULT 0,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for workers
CREATE INDEX IF NOT EXISTS idx_workers_tenant_id ON workers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_trade ON workers(trade);
CREATE INDEX IF NOT EXISTS idx_workers_created_at ON workers(created_at DESC);

-- ============================================
-- ATTENDANCE/DAILY RECORDS TABLE (يوميات العمال)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL, -- References projects(id) but no FK to allow flexibility
  date DATE NOT NULL,
  daily_rate_at_time DECIMAL(15, 2) NOT NULL, -- Rate at time of attendance (captures rate changes)
  hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 1.0, -- Default 1 day = 1.0, can be partial days
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for daily_records
CREATE INDEX IF NOT EXISTS idx_daily_records_tenant_id ON daily_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_worker_id ON daily_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_project_id ON daily_records(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_records_project_date ON daily_records(project_id, date DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for workers updated_at
DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for daily_records updated_at
DROP TRIGGER IF EXISTS update_daily_records_updated_at ON daily_records;
CREATE TRIGGER update_daily_records_updated_at
  BEFORE UPDATE ON daily_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

-- Policies for workers
CREATE POLICY "Allow all operations for authenticated users" ON workers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for daily_records
CREATE POLICY "Allow all operations for authenticated users" ON daily_records
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- UPDATE PAYMENTS TABLE: Add Labor expense category
-- ============================================
-- Update expense_category CHECK constraint to include Labor
-- Note: This requires dropping and recreating the constraint if it exists
DO $$ 
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name (it might have different naming)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'payments'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%expense_category%';
  
  -- Drop existing constraint if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
  
  -- Add new constraint with Labor category
  ALTER TABLE payments 
  ADD CONSTRAINT payments_expense_category_check 
  CHECK (expense_category IS NULL OR expense_category IN (
    'Office Rent', 
    'Salaries', 
    'Marketing', 
    'Utilities', 
    'Supplies', 
    'Labor/أجور عمال',
    'Other'
  ));
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or already has the right values, continue
    RAISE NOTICE 'Could not update expense_category constraint: %', SQLERRM;
END $$;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE workers IS 'العمال - Workers/Employees for site labor';
COMMENT ON TABLE daily_records IS 'يوميات العمال - Daily attendance records for workers on projects';
COMMENT ON COLUMN daily_records.daily_rate_at_time IS 'Daily rate at the time of attendance (captures rate changes over time)';
COMMENT ON COLUMN daily_records.hours_worked IS 'Hours worked (default 1.0 for full day, can be partial like 0.5 for half day)';
