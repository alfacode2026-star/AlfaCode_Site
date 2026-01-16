-- ============================================
-- TREASURY MANAGER TOOLS: Add Funds & Transfer
-- ============================================
-- This migration adds support for:
-- 1. Supply/Add Funds transactions
-- 2. Transfer transactions between accounts with exchange rates

-- Add columns to treasury_transactions for transfer support
ALTER TABLE treasury_transactions
ADD COLUMN IF NOT EXISTS destination_account_id TEXT,
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS source_amount DECIMAL(15, 2), -- Amount in source currency
ADD COLUMN IF NOT EXISTS destination_amount DECIMAL(15, 2); -- Amount in destination currency

-- Add foreign key constraint for destination_account_id
ALTER TABLE treasury_transactions
DROP CONSTRAINT IF EXISTS treasury_transactions_destination_account_id_fkey;

ALTER TABLE treasury_transactions
ADD CONSTRAINT treasury_transactions_destination_account_id_fkey
FOREIGN KEY (destination_account_id) REFERENCES treasury_accounts(id) ON DELETE SET NULL;

-- Add index for faster queries on destination_account_id
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_destination_account_id 
ON treasury_transactions(destination_account_id);

-- Update transaction_type constraint to include new types
-- Note: This assumes the constraint exists. If it doesn't, we'll need to check first.
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'treasury_transactions_transaction_type_check'
  ) THEN
    ALTER TABLE treasury_transactions 
    DROP CONSTRAINT treasury_transactions_transaction_type_check;
  END IF;
  
  -- Add new constraint with additional types
  ALTER TABLE treasury_transactions
  ADD CONSTRAINT treasury_transactions_transaction_type_check
  CHECK (transaction_type IN ('inflow', 'outflow', 'supply', 'transfer'));
END $$;

-- Comments for documentation
COMMENT ON COLUMN treasury_transactions.destination_account_id IS 'Target account for transfer transactions';
COMMENT ON COLUMN treasury_transactions.exchange_rate IS 'Exchange rate used for currency conversion in transfers';
COMMENT ON COLUMN treasury_transactions.source_amount IS 'Amount in source account currency';
COMMENT ON COLUMN treasury_transactions.destination_amount IS 'Amount in destination account currency after conversion';
