-- ============================================
-- MIGRATION: Update tenant_id for All Tables
-- ============================================
-- This script updates all existing records to use the active tenant ID
-- Target Tenant ID: e490935f-7141-443a-b8cc-09187575101d
-- 
-- IMPORTANT: This will update ALL records in these tables to the new tenant ID
-- Use with caution - ensure this is the correct tenant ID before running

-- Target tenant ID
DO $$
DECLARE
  target_tenant_id TEXT := 'e490935f-7141-443a-b8cc-09187575101d';
BEGIN
  -- 1. Update ORDERS table (Purchase Orders)
  -- Table name: orders
  UPDATE orders 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated orders table: % rows affected', ROW_COUNT;

  -- 2. Update PAYMENTS table (Expenses, Incomes, Advances)
  -- Table name: payments
  -- This table stores:
  --   - Expenses (transaction_type = 'regular', expense_category IS NOT NULL)
  --   - Incomes (payment_type = 'income' OR contract_id IS NOT NULL)
  --   - Advances (transaction_type = 'advance')
  --   - Settlements (transaction_type = 'settlement')
  UPDATE payments 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated payments table: % rows affected', ROW_COUNT;

  -- 3. Update LABOR_GROUPS table (External Labor Groups)
  -- Table name: labor_groups
  UPDATE labor_groups 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated labor_groups table: % rows affected', ROW_COUNT;

  -- 4. Update EMPLOYEES table (Internal Staff)
  -- Table name: employees
  UPDATE employees 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated employees table: % rows affected', ROW_COUNT;

  -- 5. Update EXPENSE_CATEGORIES table
  -- Table name: expense_categories
  UPDATE expense_categories 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated expense_categories table: % rows affected', ROW_COUNT;

  -- 6. Update TREASURY_ACCOUNTS table
  -- Table name: treasury_accounts
  UPDATE treasury_accounts 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated treasury_accounts table: % rows affected', ROW_COUNT;

  -- 7. Update TREASURY_TRANSACTIONS table
  -- Table name: treasury_transactions
  -- Note: This table may not have tenant_id directly, but transactions are linked via account_id
  -- If tenant_id column exists, update it
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'treasury_transactions' AND column_name = 'tenant_id'
    ) THEN
      UPDATE treasury_transactions 
      SET tenant_id = target_tenant_id 
      WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
      
      RAISE NOTICE 'Updated treasury_transactions table: % rows affected', ROW_COUNT;
    ELSE
      RAISE NOTICE 'treasury_transactions table does not have tenant_id column (transactions inherit from accounts)';
    END IF;
  END $$;

  -- 8. Update CUSTOMERS table (if not already updated)
  -- Table name: customers
  UPDATE customers 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated customers table: % rows affected', ROW_COUNT;

  -- 9. Update PROJECTS table (if not already updated)
  -- Table name: projects
  UPDATE projects 
  SET tenant_id = target_tenant_id 
  WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
  
  RAISE NOTICE 'Updated projects table: % rows affected', ROW_COUNT;

  -- 10. Update CONTRACTS table (if not already updated)
  -- Table name: contracts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
    UPDATE contracts 
    SET tenant_id = target_tenant_id 
    WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
    
    RAISE NOTICE 'Updated contracts table: % rows affected', ROW_COUNT;
  END IF;

  -- 11. Update QUOTATIONS table (if not already updated)
  -- Table name: quotations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
    UPDATE quotations 
    SET tenant_id = target_tenant_id 
    WHERE tenant_id IS NULL OR tenant_id != target_tenant_id;
    
    RAISE NOTICE 'Updated quotations table: % rows affected', ROW_COUNT;
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the updates:

-- SELECT COUNT(*) as total_orders, COUNT(CASE WHEN tenant_id = 'e490935f-7141-443a-b8cc-09187575101d' THEN 1 END) as matching_orders FROM orders;
-- SELECT COUNT(*) as total_payments, COUNT(CASE WHEN tenant_id = 'e490935f-7141-443a-b8cc-09187575101d' THEN 1 END) as matching_payments FROM payments;
-- SELECT COUNT(*) as total_labor_groups, COUNT(CASE WHEN tenant_id = 'e490935f-7141-443a-b8cc-09187575101d' THEN 1 END) as matching_labor_groups FROM labor_groups;
-- SELECT COUNT(*) as total_employees, COUNT(CASE WHEN tenant_id = 'e490935f-7141-443a-b8cc-09187575101d' THEN 1 END) as matching_employees FROM employees;
-- SELECT COUNT(*) as total_categories, COUNT(CASE WHEN tenant_id = 'e490935f-7141-443a-b8cc-09187575101d' THEN 1 END) as matching_categories FROM expense_categories;
-- SELECT COUNT(*) as total_accounts, COUNT(CASE WHEN tenant_id = 'e490935f-7141-443a-b8cc-09187575101d' THEN 1 END) as matching_accounts FROM treasury_accounts;
