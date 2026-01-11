-- Update customers table type column to support 'customer' and 'supplier'
-- This migration adds 'customer' and 'supplier' to the allowed type values

-- Drop the existing check constraint
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_type_check;

-- Add new check constraint that allows 'customer', 'supplier', and keeps backward compatibility with 'individual' and 'corporate'
ALTER TABLE customers 
ADD CONSTRAINT customers_type_check 
CHECK (type IN ('customer', 'supplier', 'individual', 'corporate'));

-- Note: Existing records with 'individual' or 'corporate' will remain valid
-- To migrate existing data, you may want to run:
-- UPDATE customers SET type = 'customer' WHERE type IN ('individual', 'corporate');
-- Or keep them as-is for backward compatibility
