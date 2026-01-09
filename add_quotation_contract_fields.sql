-- ============================================
-- ADD DOCUMENT TYPE TO QUOTATIONS AND PROJECT NAME TO CONTRACTS
-- Migration to add document_type field to quotations and project_name to contracts
-- ============================================

-- Add document_type to quotations table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS document_type TEXT CHECK (document_type IN ('original', 'addendum')) DEFAULT 'original';

-- Add project_name to contracts table (for display purposes even if created directly)
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quotations_document_type ON quotations(document_type);
CREATE INDEX IF NOT EXISTS idx_contracts_project_name ON contracts(project_name);

-- Add comments for documentation
COMMENT ON COLUMN quotations.document_type IS 'نوع المستند - Document type: original (عقد جديد) or addendum (ملحق)';
COMMENT ON COLUMN contracts.project_name IS 'اسم المشروع - Project name for contracts created directly';
