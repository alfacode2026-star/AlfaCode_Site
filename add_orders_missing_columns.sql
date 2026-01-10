-- ============================================
-- MIGRATION: Add Missing Columns to Orders Table
-- ============================================
-- This migration adds tenant_id, project_id, work_scope, and discount columns
-- to align with ordersService.js usage

-- Add tenant_id for multi-tenant support
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Add project_id to link orders to projects (for engineering mode)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS project_id TEXT;

-- Add work_scope to track which work scope the order relates to
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS work_scope TEXT;

-- Add discount field for order discounts
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS discount DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_project_id ON orders(project_id);
CREATE INDEX IF NOT EXISTS idx_orders_work_scope ON orders(work_scope);

-- Add comments to document the fields
COMMENT ON COLUMN orders.tenant_id IS 'Tenant ID for multi-tenant support';
COMMENT ON COLUMN orders.project_id IS 'Link to project for engineering workflow orders';
COMMENT ON COLUMN orders.work_scope IS 'Work scope this order relates to (e.g., civil_works, mep, etc.)';
COMMENT ON COLUMN orders.discount IS 'Discount amount applied to the order subtotal';
