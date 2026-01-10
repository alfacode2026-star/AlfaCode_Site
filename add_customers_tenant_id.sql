-- ============================================
-- MIGRATION: Add tenant_id to customers table
-- ============================================
-- This migration adds tenant_id column to customers table for multi-tenant support
-- Required by customersService.js

-- Add tenant_id for multi-tenant support
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Create index for tenant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- Add comment to document the field
COMMENT ON COLUMN customers.tenant_id IS 'Tenant ID for multi-tenant support - filters customers by company/tenant';
