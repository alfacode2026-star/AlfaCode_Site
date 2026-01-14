-- ============================================
-- QUOTATION BUILDER SCHEMA
-- Company Settings & Quotation Drafts Tables
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANY SETTINGS TABLE
-- Stores dynamic branding and identity information
-- ============================================
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  logo_url TEXT, -- URL or base64 encoded image
  letterhead_url TEXT, -- URL or base64 encoded image for letterhead background
  footer_text TEXT, -- Footer text content
  footer_url TEXT, -- Footer image URL (optional)
  digital_stamp_url TEXT, -- Digital stamp/signature image
  authorized_manager_name TEXT, -- Name of authorized signatory
  authorized_manager_title TEXT, -- Title/Position of authorized signatory
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  tax_number TEXT,
  commercial_register TEXT,
  letterhead_height_px INTEGER DEFAULT 150, -- Height of letterhead in pixels for padding calculation (deprecated, use margins)
  top_margin_cm DECIMAL(4, 2) DEFAULT 4.0, -- Top margin in cm (distance from top to content start)
  bottom_margin_cm DECIMAL(4, 2) DEFAULT 3.0, -- Bottom margin in cm (distance from bottom to content end)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for company_settings
CREATE INDEX IF NOT EXISTS idx_company_settings_tenant_id ON company_settings(tenant_id);

-- ============================================
-- QUOTATION DRAFTS TABLE
-- Stores draft quotations with flexible JSONB structure
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_drafts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  draft_name TEXT, -- Optional name for the draft
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT,
  subject TEXT, -- Subject of the quotation
  ref_number TEXT, -- Reference number
  quotation_date DATE DEFAULT CURRENT_DATE,
  
  -- Header table data (COMPANY, ATTENTION, PROJECT, SUBJECT, REF NO, DATE)
  header_data JSONB DEFAULT '{}'::JSONB,
  
  -- BOQ Table (Bill of Quantities) - Array of {sq: number, activities: string, amount: number}
  boq_items JSONB DEFAULT '[]'::JSONB,
  boq_total DECIMAL(15, 2) DEFAULT 0,
  
  -- Smart Defaults (editable snippets)
  introduction_text TEXT, -- Introduction paragraph
  scope_of_work JSONB DEFAULT '[]'::JSONB, -- Array of bullet points
  exclusions JSONB DEFAULT '[]'::JSONB, -- Array of exclusion items
  facilities JSONB DEFAULT '[]'::JSONB, -- Array of facility items
  terms_and_conditions TEXT, -- Terms and conditions text
  
  -- Payment milestones (if applicable)
  payment_milestones JSONB DEFAULT '[]'::JSONB,
  validity_period INTEGER, -- Validity in days
  
  -- Status and metadata
  status TEXT NOT NULL CHECK (status IN ('draft', 'finalized', 'sent')) DEFAULT 'draft',
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'user'
);

-- Indexes for quotation_drafts
CREATE INDEX IF NOT EXISTS idx_quotation_drafts_tenant_id ON quotation_drafts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_drafts_customer_id ON quotation_drafts(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_drafts_project_id ON quotation_drafts(project_id);
CREATE INDEX IF NOT EXISTS idx_quotation_drafts_status ON quotation_drafts(status);
CREATE INDEX IF NOT EXISTS idx_quotation_drafts_created_at ON quotation_drafts(created_at DESC);

-- ============================================
-- SMART DEFAULTS TEMPLATES TABLE
-- Reusable snippets for quotations
-- ============================================
CREATE TABLE IF NOT EXISTS quotation_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('introduction', 'scope', 'exclusion', 'facility', 'terms')),
  content TEXT NOT NULL, -- The actual template content
  is_default BOOLEAN DEFAULT false, -- Whether this is the default template for this type
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for quotation_templates
CREATE INDEX IF NOT EXISTS idx_quotation_templates_tenant_id ON quotation_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_templates_type ON quotation_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_quotation_templates_default ON quotation_templates(tenant_id, template_type, is_default);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for company_settings updated_at
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for quotation_drafts updated_at
DROP TRIGGER IF EXISTS update_quotation_drafts_updated_at ON quotation_drafts;
CREATE TRIGGER update_quotation_drafts_updated_at
  BEFORE UPDATE ON quotation_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for quotation_templates updated_at
DROP TRIGGER IF EXISTS update_quotation_templates_updated_at ON quotation_templates;
CREATE TRIGGER update_quotation_templates_updated_at
  BEFORE UPDATE ON quotation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_templates ENABLE ROW LEVEL SECURITY;

-- Policies for company_settings
CREATE POLICY "Allow all operations for authenticated users" ON company_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for quotation_drafts
CREATE POLICY "Allow all operations for authenticated users" ON quotation_drafts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policies for quotation_templates
CREATE POLICY "Allow all operations for authenticated users" ON quotation_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE company_settings IS 'إعدادات الشركة - Company branding and identity settings';
COMMENT ON TABLE quotation_drafts IS 'مسودات العروض - Draft quotations with flexible JSONB structure';
COMMENT ON TABLE quotation_templates IS 'قوالب العروض - Reusable snippets for quotation content';
