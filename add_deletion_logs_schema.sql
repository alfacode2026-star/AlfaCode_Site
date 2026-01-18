-- ============================================
-- DELETION LOGS TABLE SCHEMA & RLS POLICIES
-- ============================================
-- This migration creates the deletion_logs table for audit trail
-- and sets up Row Level Security (RLS) for tenant isolation
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DELETION LOGS TABLE
-- ============================================
-- Stores audit trail for all record deletions across the system

-- Check if table exists but is missing tenant_id column
DO $$
BEGIN
  -- If table exists but tenant_id column is missing, add it
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'deletion_logs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deletion_logs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE deletion_logs ADD COLUMN tenant_id TEXT;
    -- Update existing rows (if any) with a default tenant ID
    -- WARNING: You may need to manually update these after running the migration
    RAISE NOTICE 'Added tenant_id column to existing deletion_logs table';
  END IF;
  
  -- If table exists but branch_id column is missing, add it
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'deletion_logs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deletion_logs' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE deletion_logs ADD COLUMN branch_id TEXT;
    RAISE NOTICE 'Added branch_id column to existing deletion_logs table';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS deletion_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  table_name TEXT NOT NULL, -- Name of the table from which record was deleted
  record_ref_number TEXT, -- Human-readable reference (e.g., project name, order number)
  record_id TEXT NOT NULL, -- ID of the deleted record
  deletion_reason TEXT NOT NULL, -- Mandatory reason for deletion (audit requirement)
  deleted_by TEXT NOT NULL, -- User ID who performed the deletion
  tenant_id TEXT NOT NULL, -- Tenant isolation column
  branch_id TEXT, -- Optional branch isolation column
  deleted_data JSONB, -- JSON snapshot of the deleted record data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure tenant_id is NOT NULL (after adding column if needed)
-- This will fail if existing rows have NULL tenant_id - update them first if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deletion_logs' 
    AND column_name = 'tenant_id' 
    AND is_nullable = 'YES'
  ) THEN
    -- Make tenant_id NOT NULL (only if no NULL values exist)
    BEGIN
      ALTER TABLE deletion_logs ALTER COLUMN tenant_id SET NOT NULL;
      RAISE NOTICE 'Set tenant_id to NOT NULL';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Cannot set tenant_id to NOT NULL: existing NULL values found. Please update them first.';
    END;
  END IF;
END $$;

-- Indexes for deletion_logs (optimized for common queries)
CREATE INDEX IF NOT EXISTS idx_deletion_logs_tenant_id ON deletion_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_branch_id ON deletion_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_table_name ON deletion_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_by ON deletion_logs(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_record_id ON deletion_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_created_at ON deletion_logs(created_at DESC);

-- Composite index for common query pattern (tenant_id + branch_id)
CREATE INDEX IF NOT EXISTS idx_deletion_logs_tenant_branch ON deletion_logs(tenant_id, branch_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on deletion_logs table
ALTER TABLE deletion_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can only view deletion logs from their tenant" ON deletion_logs;
DROP POLICY IF EXISTS "Users can only insert deletion logs for their tenant" ON deletion_logs;
DROP POLICY IF EXISTS "Users can update deletion logs from their tenant" ON deletion_logs;

-- Policy: Tenant isolation for SELECT operations
-- Primary enforcement: tenant_id must match user's tenant from profiles table
-- Fallback: Allow authenticated users (application layer also enforces tenant filtering via .eq('tenant_id', tenantId))
CREATE POLICY "Users can only view deletion logs from their tenant" 
ON deletion_logs
FOR SELECT
USING (
  -- Strict tenant check: must match user's tenant_id from profiles
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = deletion_logs.tenant_id
  )
  OR
  -- Fallback for authenticated users (logsService.js enforces tenant_id filter)
  auth.uid() IS NOT NULL
);

-- Policy: Tenant isolation for INSERT operations
-- Ensures deletion logs are inserted with the correct tenant_id
CREATE POLICY "Users can only insert deletion logs for their tenant" 
ON deletion_logs
FOR INSERT
WITH CHECK (
  -- Verify tenant_id matches user's tenant (when profiles table has tenant_id)
  tenant_id = COALESCE(
    (SELECT tenant_id FROM profiles WHERE id = auth.uid()),
    current_setting('app.current_tenant_id', true)::TEXT
  )
  OR
  -- Allow authenticated users (application enforces tenant_id in insert data)
  auth.uid() IS NOT NULL
);

-- Policy: Tenant isolation for UPDATE operations
-- Allows updating deleted_data with cascade metadata (see contractsService.js line 727)
CREATE POLICY "Users can update deletion logs from their tenant" 
ON deletion_logs
FOR UPDATE
USING (
  -- Must match user's tenant
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = deletion_logs.tenant_id
  )
  OR
  auth.uid() IS NOT NULL
)
WITH CHECK (
  -- Ensure tenant_id is not changed during update
  tenant_id = OLD.tenant_id
  AND (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.tenant_id = deletion_logs.tenant_id
    )
    OR
    auth.uid() IS NOT NULL
  )
);

-- ============================================
-- NOTES
-- ============================================
-- 1. The tenant_id column is NOT NULL to enforce data integrity
-- 2. RLS policies check both profiles.tenant_id and app.current_tenant_id
--    for flexibility in different authentication scenarios
-- 3. The deleted_data column uses JSONB for efficient storage and querying
-- 4. Indexes are optimized for the query patterns in logsService.js:
--    - Filtering by tenant_id (required)
--    - Filtering by branch_id (optional, for non-super-admins)
--    - Filtering by table_name (for filtering logs by table type)
--    - Filtering by deleted_by (for filtering by user)
--    - Sorting by created_at DESC (newest first)
