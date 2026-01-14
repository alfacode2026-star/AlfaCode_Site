import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class CompanySettingsService {
  // Get company settings for current tenant
  async getCompanySettings() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch company settings.')
        return null
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found - return null (will create default on first use)
          return null
        }
        throw error
      }

      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching company settings:', error.message)
      return null
    }
  }

  // Create or update company settings
  async saveCompanySettings(settingsData) {
    try {
      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      // Check if settings already exist
      const existing = await this.getCompanySettings()

      const settingsToSave = {
        tenant_id: tenantId,
        company_name: settingsData.companyName || '',
        logo_url: settingsData.logoUrl || null,
        letterhead_url: settingsData.letterheadUrl || null,
        footer_text: settingsData.footerText || null,
        footer_url: settingsData.footerUrl || null,
        digital_stamp_url: settingsData.digitalStampUrl || null,
        authorized_manager_name: settingsData.authorizedManagerName || null,
        authorized_manager_title: settingsData.authorizedManagerTitle || null,
        company_address: settingsData.companyAddress || null,
        company_phone: settingsData.companyPhone || null,
        company_email: settingsData.companyEmail || null,
        company_website: settingsData.companyWebsite || null,
        tax_number: settingsData.taxNumber || null,
        commercial_register: settingsData.commercialRegister || null,
        letterhead_height_px: settingsData.letterheadHeightPx || 150,
        top_margin_cm: settingsData.topMarginCm || 4,
        bottom_margin_cm: settingsData.bottomMarginCm || 3
      }

      let result
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('company_settings')
          .update(settingsToSave)
          .eq('tenant_id', tenantId)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new
        const { data, error } = await supabase
          .from('company_settings')
          .insert([settingsToSave])
          .select()
          .single()

        if (error) throw error
        result = data
      }

      return {
        success: true,
        settings: this.mapToCamelCase(result)
      }
    } catch (error) {
      console.error('Error saving company settings:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to save company settings',
        errorCode: 'SAVE_SETTINGS_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(settings) {
    if (!settings) return null

    return {
      id: settings.id,
      tenantId: settings.tenant_id,
      companyName: settings.company_name,
      logoUrl: settings.logo_url,
      letterheadUrl: settings.letterhead_url,
      footerText: settings.footer_text,
      footerUrl: settings.footer_url,
      digitalStampUrl: settings.digital_stamp_url,
      authorizedManagerName: settings.authorized_manager_name,
      authorizedManagerTitle: settings.authorized_manager_title,
      companyAddress: settings.company_address,
      companyPhone: settings.company_phone,
      companyEmail: settings.company_email,
      companyWebsite: settings.company_website,
      taxNumber: settings.tax_number,
      commercialRegister: settings.commercial_register,
      letterheadHeightPx: settings.letterhead_height_px || 150,
      topMarginCm: settings.top_margin_cm || 4,
      bottomMarginCm: settings.bottom_margin_cm || 3,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at
    }
  }
}

const companySettingsService = new CompanySettingsService()
export default companySettingsService
