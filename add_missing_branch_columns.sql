-- ============================================
-- MIGRATION: Add Missing branch_id and tenant_id Columns
-- ============================================
-- This script safely adds branch_id and tenant_id columns to tables that are missing them.
-- It checks for column existence before adding to prevent errors on re-runs.
-- 
-- Target Tables:
--   - customers
--   - payments
--   - general_expenses (or expenses if it exists)
--   - incomes
--   - inventory (products table)
--   - workers
--
-- IMPORTANT: This script is idempotent - safe to run multiple times.
-- ============================================

DO $$
DECLARE
  column_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  -- ============================================
  -- 1. CUSTOMERS TABLE
  -- ============================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'customers'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check and add tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'customers' 
      AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE customers ADD COLUMN tenant_id UUID;
      CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
      RAISE NOTICE 'Added tenant_id column to customers table';
    ELSE
      RAISE NOTICE 'customers.tenant_id already exists';
    END IF;
    
    -- Check and add branch_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'customers' 
      AND column_name = 'branch_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE customers ADD COLUMN branch_id UUID;
      CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
      RAISE NOTICE 'Added branch_id column to customers table';
    ELSE
      RAISE NOTICE 'customers.branch_id already exists';
    END IF;
  ELSE
    RAISE NOTICE 'customers table does not exist, skipping';
  END IF;

  -- ============================================
  -- 2. PAYMENTS TABLE
  -- ============================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check and add tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE payments ADD COLUMN tenant_id UUID;
      CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
      RAISE NOTICE 'Added tenant_id column to payments table';
    ELSE
      RAISE NOTICE 'payments.tenant_id already exists';
    END IF;
    
    -- Check and add branch_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'branch_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE payments ADD COLUMN branch_id UUID;
      CREATE INDEX IF NOT EXISTS idx_payments_branch_id ON payments(branch_id);
      RAISE NOTICE 'Added branch_id column to payments table';
    ELSE
      RAISE NOTICE 'payments.branch_id already exists';
    END IF;
  ELSE
    RAISE NOTICE 'payments table does not exist, skipping';
  END IF;

  -- ============================================
  -- 3. GENERAL_EXPENSES TABLE (or expenses)
  -- ============================================
  -- Try general_expenses first
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'general_expenses'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check and add tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'general_expenses' 
      AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE general_expenses ADD COLUMN tenant_id UUID;
      CREATE INDEX IF NOT EXISTS idx_general_expenses_tenant_id ON general_expenses(tenant_id);
      RAISE NOTICE 'Added tenant_id column to general_expenses table';
    ELSE
      RAISE NOTICE 'general_expenses.tenant_id already exists';
    END IF;
    
    -- Check and add branch_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'general_expenses' 
      AND column_name = 'branch_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE general_expenses ADD COLUMN branch_id UUID;
      CREATE INDEX IF NOT EXISTS idx_general_expenses_branch_id ON general_expenses(branch_id);
      RAISE NOTICE 'Added branch_id column to general_expenses table';
    ELSE
      RAISE NOTICE 'general_expenses.branch_id already exists';
    END IF;
  ELSE
    -- Try expenses table
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'expenses'
    ) INTO table_exists;
    
    IF table_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'tenant_id'
      ) INTO column_exists;
      
      IF NOT column_exists THEN
        ALTER TABLE expenses ADD COLUMN tenant_id UUID;
        CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
        RAISE NOTICE 'Added tenant_id column to expenses table';
      END IF;
      
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'branch_id'
      ) INTO column_exists;
      
      IF NOT column_exists THEN
        ALTER TABLE expenses ADD COLUMN branch_id UUID;
        CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
        RAISE NOTICE 'Added branch_id column to expenses table';
      END IF;
    ELSE
      RAISE NOTICE 'Neither general_expenses nor expenses table exists, skipping';
    END IF;
  END IF;

  -- ============================================
  -- 4. INCOMES TABLE
  -- ============================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'incomes'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check and add tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'incomes' 
      AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE incomes ADD COLUMN tenant_id UUID;
      CREATE INDEX IF NOT EXISTS idx_incomes_tenant_id ON incomes(tenant_id);
      RAISE NOTICE 'Added tenant_id column to incomes table';
    ELSE
      RAISE NOTICE 'incomes.tenant_id already exists';
    END IF;
    
    -- Check and add branch_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'incomes' 
      AND column_name = 'branch_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE incomes ADD COLUMN branch_id UUID;
      CREATE INDEX IF NOT EXISTS idx_incomes_branch_id ON incomes(branch_id);
      RAISE NOTICE 'Added branch_id column to incomes table';
    ELSE
      RAISE NOTICE 'incomes.branch_id already exists';
    END IF;
  ELSE
    RAISE NOTICE 'incomes table does not exist, skipping';
  END IF;

  -- ============================================
  -- 5. INVENTORY TABLE (products)
  -- ============================================
  -- Try 'inventory' first
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'inventory'
  ) INTO table_exists;
  
  IF table_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'inventory' 
      AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE inventory ADD COLUMN tenant_id UUID;
      CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON inventory(tenant_id);
      RAISE NOTICE 'Added tenant_id column to inventory table';
    END IF;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'inventory' 
      AND column_name = 'branch_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE inventory ADD COLUMN branch_id UUID;
      CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON inventory(branch_id);
      RAISE NOTICE 'Added branch_id column to inventory table';
    END IF;
  ELSE
    -- Try 'products' table
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'products'
    ) INTO table_exists;
    
    IF table_exists THEN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'tenant_id'
      ) INTO column_exists;
      
      IF NOT column_exists THEN
        ALTER TABLE products ADD COLUMN tenant_id UUID;
        CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
        RAISE NOTICE 'Added tenant_id column to products table';
      END IF;
      
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'branch_id'
      ) INTO column_exists;
      
      IF NOT column_exists THEN
        ALTER TABLE products ADD COLUMN branch_id UUID;
        CREATE INDEX IF NOT EXISTS idx_products_branch_id ON products(branch_id);
        RAISE NOTICE 'Added branch_id column to products table';
      END IF;
    ELSE
      RAISE NOTICE 'Neither inventory nor products table exists, skipping';
    END IF;
  END IF;

  -- ============================================
  -- 6. WORKERS TABLE
  -- ============================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'workers'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check and add tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workers' 
      AND column_name = 'tenant_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE workers ADD COLUMN tenant_id UUID;
      CREATE INDEX IF NOT EXISTS idx_workers_tenant_id ON workers(tenant_id);
      RAISE NOTICE 'Added tenant_id column to workers table';
    ELSE
      RAISE NOTICE 'workers.tenant_id already exists';
    END IF;
    
    -- Check and add branch_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'workers' 
      AND column_name = 'branch_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      ALTER TABLE workers ADD COLUMN branch_id UUID;
      CREATE INDEX IF NOT EXISTS idx_workers_branch_id ON workers(branch_id);
      RAISE NOTICE 'Added branch_id column to workers table';
    ELSE
      RAISE NOTICE 'workers.branch_id already exists';
    END IF;
  ELSE
    RAISE NOTICE 'workers table does not exist, skipping';
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- ============================================
-- OPTIONAL: Add Foreign Key Constraints
-- ============================================
-- Uncomment the following section to add foreign key constraints
-- This will enforce referential integrity between tables
-- ============================================

/*
DO $$
BEGIN
  -- Foreign key constraints to branches table (if it exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
    
    -- customers.branch_id -> branches.id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_customers_branch_id'
    ) THEN
      ALTER TABLE customers 
      ADD CONSTRAINT fk_customers_branch_id 
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint fk_customers_branch_id';
    END IF;
    
    -- payments.branch_id -> branches.id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_payments_branch_id'
    ) THEN
      ALTER TABLE payments 
      ADD CONSTRAINT fk_payments_branch_id 
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint fk_payments_branch_id';
    END IF;
    
    -- Add more FK constraints as needed for other tables...
    
  ELSE
    RAISE NOTICE 'branches table does not exist, skipping foreign key constraints';
  END IF;
  
  -- Foreign key constraints to tenants table (if it exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    
    -- customers.tenant_id -> tenants.id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_customers_tenant_id'
    ) THEN
      ALTER TABLE customers 
      ADD CONSTRAINT fk_customers_tenant_id 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint fk_customers_tenant_id';
    END IF;
    
    -- payments.tenant_id -> tenants.id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_payments_tenant_id'
    ) THEN
      ALTER TABLE payments 
      ADD CONSTRAINT fk_payments_tenant_id 
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
      RAISE NOTICE 'Added foreign key constraint fk_payments_tenant_id';
    END IF;
    
    -- Add more FK constraints as needed for other tables...
    
  ELSE
    RAISE NOTICE 'tenants table does not exist, skipping foreign key constraints';
  END IF;
END $$;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries after migration to verify column existence:

-- Check customers table
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'customers' 
-- AND column_name IN ('tenant_id', 'branch_id');

-- Check payments table
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'payments' 
-- AND column_name IN ('tenant_id', 'branch_id');

-- Check all tables at once
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('customers', 'payments', 'general_expenses', 'incomes', 'inventory', 'products', 'workers')
-- AND column_name IN ('tenant_id', 'branch_id')
-- ORDER BY table_name, column_name;
