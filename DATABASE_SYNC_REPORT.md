# DATABASE SYNC REPORT: Currency Column Verification

## ⚠️ CRITICAL FINDINGS

### Tables Missing `currency` Column:

1. **`payments` table** - ❌ NO `currency` column
   - Location: `engineering_workflow_schema.sql` (lines 97-112)
   - Current columns: `id`, `tenant_id`, `contract_id`, `payment_number`, `amount`, `due_date`, `paid_date`, `status`, `payment_method`, `reference_number`, `notes`, `created_at`, `updated_at`, `created_by`
   - Additional columns from migrations: `payment_type`, `project_id`, `work_scope`, `transaction_type`, `manager_name`, `linked_advance_id`, `payment_frequency`, `is_general_expense`
   - **ACTION REQUIRED**: Add `currency TEXT DEFAULT 'SAR'` column

2. **`orders` table** - ❌ NO `currency` column
   - Location: `supabase_schema.sql` (lines 45-64)
   - Current columns: `id`, `customer_id`, `customer_name`, `customer_phone`, `customer_email`, `subtotal`, `tax`, `total`, `status`, `payment_method`, `payment_status`, `shipping_method`, `shipping_address`, `tracking_number`, `notes`, `created_at`, `updated_at`, `created_by`
   - Additional columns from migrations: `tenant_id`, `project_id`, `work_scope`, `discount`
   - **ACTION REQUIRED**: Add `currency TEXT DEFAULT 'SAR'` column

3. **`incomes` table** - ⚠️ NEEDS VERIFICATION
   - Location: Unknown (may be in `add_payment_income_fields.sql` or separate table)
   - **ACTION REQUIRED**: Verify if `incomes` table exists and check for `currency` column

### Tables WITH `currency` Column (Verified):

1. **`treasury_accounts` table** - ✅ HAS `currency` column
   - Verified in `TreasuryPage.tsx` and `treasuryService.js`
   - Column: `currency TEXT` (stores currency code like 'SAR', 'USD', 'IQD')

## 📋 REQUIRED SQL MIGRATIONS

### Migration 1: Add Currency to Payments Table

```sql
-- ============================================
-- MIGRATION: Add Currency Column to Payments
-- ============================================
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';

-- Add index for currency filtering
CREATE INDEX IF NOT EXISTS idx_payments_currency ON payments(currency);

-- Add comment
COMMENT ON COLUMN payments.currency IS 'Currency code (e.g., SAR, USD, IQD, AED) - synced from treasury_accounts.currency';
```

### Migration 2: Add Currency to Orders Table

```sql
-- ============================================
-- MIGRATION: Add Currency Column to Orders
-- ============================================
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';

-- Add index for currency filtering
CREATE INDEX IF NOT EXISTS idx_orders_currency ON orders(currency);

-- Add comment
COMMENT ON COLUMN orders.currency IS 'Currency code (e.g., SAR, USD, IQD, AED) - synced from treasury_accounts.currency';
```

### Migration 3: Verify/Add Currency to Incomes Table

```sql
-- ============================================
-- MIGRATION: Add Currency Column to Incomes (if table exists)
-- ============================================
-- First, check if incomes table exists:
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_name = 'incomes'
-- );

-- If table exists, add currency column:
ALTER TABLE incomes 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';

-- Add index for currency filtering
CREATE INDEX IF NOT EXISTS idx_incomes_currency ON incomes(currency);

-- Add comment
COMMENT ON COLUMN incomes.currency IS 'Currency code (e.g., SAR, USD, IQD, AED) - synced from treasury_accounts.currency';
```

## ✅ VERIFICATION CHECKLIST

Before proceeding with service updates:
- [ ] Run Migration 1 (payments table)
- [ ] Run Migration 2 (orders table)
- [ ] Verify/run Migration 3 (incomes table - if exists)
- [ ] Confirm all migrations executed successfully
- [ ] Verify columns exist using: `SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'currency';`

## 🎯 NEXT STEPS

1. **STOP** - Do not modify services until migrations are run
2. Run the SQL migrations above
3. Verify columns exist in database
4. Then proceed with service and frontend updates
