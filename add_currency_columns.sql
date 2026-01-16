-- ============================================
-- MIGRATION: Add Currency Columns to Payments, Orders, and Incomes Tables
-- ============================================
-- This migration adds currency support to all transaction tables
-- Currency is synced from treasury_accounts.currency when a treasury is selected

-- ============================================
-- 1. Add Currency to Payments Table
-- ============================================
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';

-- Add index for currency filtering
CREATE INDEX IF NOT EXISTS idx_payments_currency ON payments(currency);

-- Add comment
COMMENT ON COLUMN payments.currency IS 'Currency code (e.g., SAR, USD, IQD, AED) - synced from treasury_accounts.currency';

-- ============================================
-- 2. Add Currency to Orders Table
-- ============================================
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR';

-- Add index for currency filtering
CREATE INDEX IF NOT EXISTS idx_orders_currency ON orders(currency);

-- Add comment
COMMENT ON COLUMN orders.currency IS 'Currency code (e.g., SAR, USD, IQD, AED) - synced from treasury_accounts.currency';

-- ============================================
-- NOTE: Incomes are stored in the payments table
-- ============================================
-- The incomesService.js uses the payments table with payment_type='income'
-- So adding currency to payments table covers both expenses and incomes

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the columns were added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'payments' AND column_name = 'currency';

-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' AND column_name = 'currency';
