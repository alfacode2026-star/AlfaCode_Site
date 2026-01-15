-- ============================================
-- SYSTEM SETTINGS TABLE
-- Stores global system configuration and setup status
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000',
  is_setup_completed BOOLEAN NOT NULL DEFAULT false,
  setup_completed_at TIMESTAMP WITH TIME ZONE,
  setup_completed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default record if it doesn't exist
INSERT INTO system_settings (id, is_setup_completed)
VALUES ('00000000-0000-0000-0000-000000000000', false)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read/write
CREATE POLICY "Allow all operations for authenticated users" ON system_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE system_settings IS 'System-wide settings and configuration';
COMMENT ON COLUMN system_settings.is_setup_completed IS 'Whether the initial setup wizard has been completed';
COMMENT ON COLUMN system_settings.setup_completed_at IS 'Timestamp when setup was completed';
COMMENT ON COLUMN system_settings.setup_completed_by IS 'User ID who completed the setup';
