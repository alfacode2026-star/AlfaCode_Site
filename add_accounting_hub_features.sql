-- 1. التأكد من وجود الدالة الأساسية
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. إضافة الأعمدة الجديدة (مع جعل النوع مطابقاً لـ ID الجدول الأصلي)
-- linked_advance_id يجب أن يكون TEXT ليتوافق مع payments.id (TEXT)
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS manager_name TEXT,
ADD COLUMN IF NOT EXISTS linked_advance_id TEXT, -- TEXT ليتوافق مع payments.id (TEXT PRIMARY KEY)
ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'one-time',
ADD COLUMN IF NOT EXISTS is_general_expense BOOLEAN DEFAULT false;

-- 3. إضافة القيد (Foreign Key) 
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_linked_advance_id_fkey;

ALTER TABLE payments 
ADD CONSTRAINT payments_linked_advance_id_fkey 
FOREIGN KEY (linked_advance_id) REFERENCES payments(id) ON DELETE SET NULL;

-- 4. إنشاء جدول الفئات
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT, -- Arabic name (optional)
    type TEXT NOT NULL, -- 'administrative' or 'project'
    is_system BOOLEAN DEFAULT false, -- System categories cannot be deleted
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT DEFAULT 'user',
    UNIQUE(tenant_id, name, type)
);

-- Trigger for expense_categories updated_at
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. تفعيل الحماية RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expense_categories;
CREATE POLICY "Allow all operations for authenticated users" ON expense_categories FOR ALL USING (true) WITH CHECK (true);

-- 6. تنظيف قيود الفئة القديمة للسماح بالإضافات الجديدة
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%expense_category%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
    
    ALTER TABLE payments 
    ADD CONSTRAINT payments_expense_category_check 
    CHECK (expense_category IS NULL OR expense_category <> '');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update handled.';
END $$;