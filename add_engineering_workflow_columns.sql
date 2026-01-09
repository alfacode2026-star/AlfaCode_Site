-- ============================================
-- ADD ENGINEERING WORKFLOW COLUMNS
-- Migration to add project_name, work_scopes, and quotation_id
-- ============================================

-- Add project_name to quotations table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Add work_scopes (TEXT ARRAY) to quotations table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS work_scopes TEXT[];

-- Add work_scopes (TEXT ARRAY) to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS work_scopes TEXT[];

-- Add quotation_id to projects table (references quotations.id)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS quotation_id TEXT REFERENCES quotations(id) ON DELETE SET NULL;

-- Create index on quotation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_quotation_id ON projects(quotation_id);

-- Add comment for documentation
COMMENT ON COLUMN quotations.project_name IS 'اسم المشروع - Project name from quotation';
COMMENT ON COLUMN quotations.work_scopes IS 'نطاق العمل - Work scopes array (e.g., HVAC, Plumbing, Electrical)';
COMMENT ON COLUMN projects.work_scopes IS 'نطاق العمل - Work scopes array copied from quotation';
COMMENT ON COLUMN projects.quotation_id IS 'معرف العرض - Reference to the quotation that created this project';
