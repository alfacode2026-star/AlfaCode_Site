-- ============================================
-- MIGRATION: Add project_ids array support to labor_groups
-- Allows labor groups to be associated with multiple projects
-- ============================================

-- Add project_ids column as TEXT array (for multiple project associations)
ALTER TABLE labor_groups 
ADD COLUMN IF NOT EXISTS project_ids TEXT[];

-- Create index for project_ids array (using GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_labor_groups_project_ids ON labor_groups USING GIN(project_ids);

-- Migrate existing data: if project_id exists, populate project_ids array
UPDATE labor_groups 
SET project_ids = ARRAY[project_id]::TEXT[]
WHERE project_id IS NOT NULL AND (project_ids IS NULL OR array_length(project_ids, 1) IS NULL);

-- Add comment for documentation
COMMENT ON COLUMN labor_groups.project_ids IS 'Array of project IDs associated with this labor group (allows multiple projects per group)';
