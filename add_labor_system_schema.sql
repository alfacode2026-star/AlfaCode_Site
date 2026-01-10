-- 1. إنشاء الدالة أولاً (هذا يحل خطأ 42883)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. الآن نقوم بإنشاء جداول العمال
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trade TEXT NOT NULL,
  default_daily_rate DECIMAL(15, 2) NOT NULL DEFAULT 0,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  worker_id TEXT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  date DATE NOT NULL,
  daily_rate_at_time DECIMAL(15, 2) NOT NULL,
  hours_worked DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- 3. إنشاء الـ Triggers
DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_records_updated_at ON daily_records;
CREATE TRIGGER update_daily_records_updated_at
  BEFORE UPDATE ON daily_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. تفعيل الحماية (RLS)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON workers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON daily_records FOR ALL USING (true) WITH CHECK (true);