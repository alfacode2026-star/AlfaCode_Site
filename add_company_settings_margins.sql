-- Add margin columns to company_settings table for full-page letterhead support
-- This allows content to flow over watermarks with proper spacing

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS top_margin_cm DECIMAL(4, 2) DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS bottom_margin_cm DECIMAL(4, 2) DEFAULT 3.0;

COMMENT ON COLUMN company_settings.top_margin_cm IS 'Top margin in cm - distance from top of letterhead to start of content';
COMMENT ON COLUMN company_settings.bottom_margin_cm IS 'Bottom margin in cm - distance from bottom of letterhead to end of content';
