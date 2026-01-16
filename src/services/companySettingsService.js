import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class CompanySettingsService {
  // Get company settings for current tenant
  // Fetches from tenants, branches, and company_settings tables and merges them
  async getCompanySettings() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch company settings.')
        return null
      }

      // 1. Fetch tenant data DIRECTLY from tenants table (PRIMARY SOURCE OF TRUTH)
      // This is the data entered during installation - it's the authoritative source
      // NOTE: email is NOT in tenants table - fetch it from profiles table instead
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, logo_url, phone, address, website, manager_name')
        .eq('id', tenantId)
        .single()

      if (tenantError) {
        if (tenantError.code === 'PGRST116') {
          console.warn('No tenant found with ID:', tenantId)
        } else {
          console.error('Error fetching tenant data:', tenantError)
        }
      } else if (tenantData) {
        console.log('✅ Fetched tenant data from installation:', { name: tenantData.name, id: tenantData.id })
      }

      // 2. Fetch main branch data (all available fields from installation)
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_main', true)
        .single()

      // 2b. Fetch super admin profile data for manager name (from installation)
      const { data: adminProfileData, error: adminError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('tenant_id', tenantId)
        .eq('role', 'super_admin')
        .limit(1)
        .maybeSingle()

      if (branchError) {
        if (branchError.code === 'PGRST116') {
          console.warn('No main branch found for tenant:', tenantId)
        } else {
          console.error('Error fetching branch data:', branchError)
        }
      } else if (branchData) {
        console.log('✅ Fetched branch data from installation:', { name: branchData.name, currency: branchData.currency })
      }

      // Handle admin profile fetch errors
      if (adminError) {
        if (adminError.code === 'PGRST116') {
          console.log('ℹ️ No super admin profile found for tenant:', tenantId)
        } else {
          console.warn('Error fetching admin profile:', adminError)
        }
      } else if (adminProfileData) {
        console.log('✅ Fetched admin profile from installation:', { name: adminProfileData.full_name, email: adminProfileData.email })
      }

      // 3. Fetch company_settings data (may be empty for new installations)
      // Wrap in try/catch to handle 406 errors gracefully
      let settingsData = null
      try {
        const { data, error: settingsError } = await supabase
          .from('company_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .single()

        if (settingsError) {
          if (settingsError.code === 'PGRST116') {
            // No record found - this is normal for new installations
            console.log('ℹ️ No company_settings record found (this is normal for new installations)')
            settingsData = null
          } else if (settingsError.code === '406' || settingsError.message?.includes('406')) {
            // 406 Not Acceptable - record doesn't exist yet, return empty object
            console.log('ℹ️ company_settings record doesn\'t exist yet (406 error - normal for new installations)')
            settingsData = null
          } else {
            console.error('Error fetching company settings:', settingsError)
            settingsData = null
          }
        } else if (data) {
          settingsData = data
          console.log('✅ Fetched company_settings data')
        }
      } catch (error) {
        // Catch any unexpected errors (including 406)
        console.log('ℹ️ company_settings fetch error (handled gracefully):', error.message)
        settingsData = null
      }

      // Merge all data together
      // CRITICAL: tenants table is the SINGLE SOURCE OF TRUTH for company name and logo
      // company_settings is ONLY for quotation-specific customizations (letterhead, margins, etc.)
      const mergedData = {
        // PRIMARY SOURCE: Installation data from tenants table
        // Force these values to always come from tenantData (installation)
        tenant_name: tenantData?.name || null,
        tenant_phone: tenantData?.phone || null,
        tenant_address: tenantData?.address || null,
        tenant_website: tenantData?.website || null,
        tenant_logo_url: tenantData?.logo_url || null, // Logo from installation
        tenant_manager_name: tenantData?.manager_name || null, // Manager name from tenants table
        
        // Installation data from branches table
        branch_name: branchData?.name || null,
        branch_address: branchData?.address || null,
        currency: branchData?.currency || 'SAR',
        
        // Installation data from profiles table (super_admin) - email comes from here
        manager_name: tenantData?.manager_name || adminProfileData?.full_name || null,
        manager_email: adminProfileData?.email || null, // Email from profiles, NOT tenants
        
        // From company_settings table (ONLY for quotation customizations, NOT company name/logo)
        ...(settingsData || {}),
        
        // CRITICAL: company_name ALWAYS uses tenant name from installation (PRIMARY SOURCE)
        // Force this to use tenantData.name even if settingsData has a different value
        company_name: tenantData?.name || null,
        
        // CRITICAL: logo_url ALWAYS uses tenant logo from installation (PRIMARY SOURCE)
        logo_url: tenantData?.logo_url || null,
        
        // Override other fields with tenant/branch/profile data if company_settings doesn't have them
        company_phone: settingsData?.company_phone || tenantData?.phone || branchData?.phone || null,
        // Email comes from profiles table (adminProfileData), NOT tenants table
        company_email: settingsData?.company_email || adminProfileData?.email || null,
        company_address: settingsData?.company_address || tenantData?.address || branchData?.address || null,
        company_website: settingsData?.company_website || tenantData?.website || null,
        // Manager name from tenants table (installation) or profiles (fallback)
        authorized_manager_name: tenantData?.manager_name || adminProfileData?.full_name || null
      }
      
      // CRITICAL: Force these values to always use installation data (override any settingsData values)
      mergedData.tenant_name = tenantData?.name || null
      mergedData.branch_name = branchData?.name || null
      mergedData.logo_url = tenantData?.logo_url || null
      mergedData.company_name = tenantData?.name || null
      // Email always from profiles, never from tenants
      mergedData.company_email = adminProfileData?.email || settingsData?.company_email || null

      // Always return data if we have at least tenant OR branch info, even if company_settings is empty
      // CRITICAL: Don't return null if we have installation data (tenant or branch)
      if (!tenantData && !branchData && !settingsData) {
        // No data at all - return null
        console.warn('⚠️ No data found: tenant, branch, or company_settings')
        return null
      }
      
      // CRITICAL: Ensure tenant_name and branch_name are always set from installation data
      // These are the PRIMARY SOURCE OF TRUTH, not company_settings
      if (tenantData && !mergedData.tenant_name) {
        console.warn('⚠️ tenantData exists but tenant_name not set. Fixing...')
        mergedData.tenant_name = tenantData.name
        mergedData.company_name = tenantData.name
      }
      
      if (branchData && !mergedData.branch_name) {
        console.warn('⚠️ branchData exists but branch_name not set. Fixing...')
        mergedData.branch_name = branchData.name
      }

      // Log merged data before mapping
      console.log('📦 Merged Data (before mapping):', {
        tenant_name: mergedData.tenant_name,
        branch_name: mergedData.branch_name,
        company_name: mergedData.company_name,
        logo_url: mergedData.logo_url,
        tenant_logo_url: mergedData.tenant_logo_url,
        manager_name: mergedData.manager_name,
        has_company_settings: !!settingsData,
        has_tenant_data: !!tenantData,
        tenant_name_from_db: tenantData?.name
      })

      const mappedData = this.mapToCamelCase(mergedData)
      
      // Log mapped data after conversion
      console.log('📦 Mapped Data (after camelCase):', {
        companyName: mappedData?.companyName,
        tenantName: mappedData?.tenantName,
        branchName: mappedData?.branchName,
        authorizedManagerName: mappedData?.authorizedManagerName,
        companyEmail: mappedData?.companyEmail
      })

      return mappedData
    } catch (error) {
      console.error('Error fetching company settings:', error.message)
      return null
    }
  }

  // Create or update company settings
  // Also updates tenants table if company name changes
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

      // Fetch tenant data for fallback if company_name is empty
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single()

      // 1. Update tenants table with company name, logo, and manager name
      // This is the PRIMARY SOURCE OF TRUTH - updates here reflect everywhere immediately
      const tenantUpdatePayload = {}
      
      if (settingsData.companyName) {
        tenantUpdatePayload.name = settingsData.companyName
        console.log('🔄 Updating tenant name in tenants table:', settingsData.companyName)
      }
      
      if (settingsData.logoUrl) {
        tenantUpdatePayload.logo_url = settingsData.logoUrl
        console.log('🖼️ Updating tenant logo_url in tenants table')
      }
      
      // Map manager name to tenants.manager_name (if column exists)
      if (settingsData.authorizedManagerName) {
        tenantUpdatePayload.manager_name = settingsData.authorizedManagerName
        console.log('👤 Updating tenant manager_name in tenants table:', settingsData.authorizedManagerName)
      }
      
      if (Object.keys(tenantUpdatePayload).length > 0) {
        const { data: tenantUpdateData, error: tenantUpdateError } = await supabase
          .from('tenants')
          .update(tenantUpdatePayload)
          .eq('id', tenantId)
          .select()
          .single()

        if (tenantUpdateError) {
          console.error('❌ Error updating tenant:', tenantUpdateError)
          console.error('❌ Tenant update error details:', {
            message: tenantUpdateError.message,
            code: tenantUpdateError.code,
            details: tenantUpdateError.details
          })
          // Don't fail the whole operation, but log the error
        } else {
          console.log('✅ Successfully updated tenants table:', {
            name: tenantUpdateData?.name,
            hasLogo: !!tenantUpdateData?.logo_url,
            hasManager: !!tenantUpdateData?.manager_name
          })
        }
      }

      // 2. Save to company_settings table
      // Ensure company_name is never empty (it's NOT NULL in schema)
      // Use tenant name as fallback if company name is not provided
      const companyNameToSave = settingsData.companyName || tenantData?.name || existing?.tenantName || 'Company'
      
      // Build settings payload - ONLY include columns that exist in company_settings schema
      // REMOVED: authorized_manager_name (doesn't exist in actual DB, stored in tenants.manager_name instead)
      // REMOVED: logo_url (stored in tenants.logo_url as PRIMARY SOURCE)
      // REMOVED: company_name (stored in tenants.name as PRIMARY SOURCE)
      // company_settings is ONLY for quotation-specific customizations
      const settingsToSave = {
        tenant_id: tenantId, // CRITICAL: Must be included for upsert
        company_name: companyNameToSave, // NOT NULL - must have a value (for backward compatibility)
        // logo_url and company_name are stored in tenants table, not here
        letterhead_url: settingsData.letterheadUrl || null,
        footer_text: settingsData.footerText || null,
        footer_url: settingsData.footerUrl || null,
        digital_stamp_url: settingsData.digitalStampUrl || null,
        // REMOVED: authorized_manager_name - stored in tenants.manager_name instead
        authorized_manager_title: settingsData.authorizedManagerTitle || null,
        company_address: settingsData.companyAddress || null,
        company_phone: settingsData.companyPhone || null,
        company_email: settingsData.companyEmail || null,
        company_website: settingsData.companyWebsite || null,
        tax_number: settingsData.taxNumber && settingsData.taxNumber.trim() ? settingsData.taxNumber.trim() : null,
        commercial_register: settingsData.commercialRegister || null,
        letterhead_height_px: settingsData.letterheadHeightPx || 150,
        top_margin_cm: settingsData.topMarginCm || 4,
        bottom_margin_cm: settingsData.bottomMarginCm || 3
      }
      
      // Remove any undefined values to avoid issues
      Object.keys(settingsToSave).forEach(key => {
        if (settingsToSave[key] === undefined) {
          delete settingsToSave[key]
        }
      })

      // 2. Use UPSERT to save to company_settings table
      // This will INSERT if record doesn't exist, or UPDATE if it does
      console.log('💾 Saving company_settings with upsert for tenant:', tenantId)
      console.log('📦 Settings to save:', {
        company_name: settingsToSave.company_name,
        has_logo: !!settingsToSave.logo_url,
        has_letterhead: !!settingsToSave.letterhead_url,
        has_stamp: !!settingsToSave.digital_stamp_url
      })

      // Use upsert - will INSERT if tenant_id doesn't exist, UPDATE if it does
      // tenant_id has UNIQUE constraint, so we use it as the conflict target
      console.log('📤 Upsert payload (final):', JSON.stringify(settingsToSave, null, 2))
      console.log('📤 Upsert payload keys:', Object.keys(settingsToSave))
      
      const { data: result, error: upsertError } = await supabase
        .from('company_settings')
        .upsert(settingsToSave, {
          onConflict: 'tenant_id'
        })
        .select()
        .single()

      if (upsertError) {
        console.error('❌ Error upserting company_settings:', upsertError)
        console.error('❌ Error details:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint
        })
        throw upsertError
      }

      if (!result) {
        throw new Error('Upsert succeeded but no data returned')
      }

      console.log('✅ Successfully saved company_settings:', {
        id: result.id,
        company_name: result.company_name,
        has_logo: !!result.logo_url
      })

      // 3. Fetch updated tenant data to include in response
      const { data: updatedTenantData } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('id', tenantId)
        .single()

      // Merge with tenant name
      const mergedResult = {
        ...result,
        tenant_name: updatedTenantData?.name || settingsData.companyName
      }

      return {
        success: true,
        settings: this.mapToCamelCase(mergedResult)
      }
    } catch (error) {
      console.error('❌ Error saving company settings:', error)
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      })
      return {
        success: false,
        error: error.message || 'Failed to save company settings',
        errorCode: error.code || 'SAVE_SETTINGS_FAILED',
        errorDetails: error.details || null
      }
    }
  }

  // Helper: Map snake_case to camelCase
  // Handles cases where company_settings is empty but tenant/branch data exists
  mapToCamelCase(settings) {
    if (!settings) return null

    // Get tenant_id from current tenantStore if not in settings (when company_settings is empty)
    const tenantId = settings.tenant_id || tenantStore.getTenantId()

    return {
      id: settings.id || null, // May be null if company_settings doesn't exist yet
      tenantId: tenantId,
      // CRITICAL: tenants.name is the SINGLE SOURCE OF TRUTH for company name
      companyName: settings.tenant_name || null,
      tenantName: settings.tenant_name || null, // Original tenant name from tenants table (installation data)
      branchName: settings.branch_name || null, // Branch name from branches table (installation data)
      currency: settings.currency || 'SAR', // Currency from branches table (installation data)
      // CRITICAL: tenants.logo_url is the SINGLE SOURCE OF TRUTH for logo
      logoUrl: settings.tenant_logo_url || settings.logo_url || null,
      letterheadUrl: settings.letterhead_url || null,
      footerText: settings.footer_text || null,
      footerUrl: settings.footer_url || null,
      digitalStampUrl: settings.digital_stamp_url || null,
      // Manager name from tenants table (installation) or profiles (fallback)
      authorizedManagerName: settings.tenant_manager_name || settings.manager_name || null,
      authorizedManagerTitle: settings.authorized_manager_title || null,
      // Map tenant/branch fields as fallback for company fields
      companyAddress: settings.company_address || settings.tenant_address || settings.branch_address || null,
      companyPhone: settings.company_phone || settings.tenant_phone || null,
      // Email comes from profiles (manager_email), NOT from tenants table
      companyEmail: settings.company_email || settings.manager_email || null,
      companyWebsite: settings.company_website || settings.tenant_website || null,
      taxNumber: settings.tax_number || null,
      commercialRegister: settings.commercial_register || null,
      // NOTE: vat_percentage and vat_enabled don't exist in company_settings table schema
      // These are kept for UI compatibility but won't be saved to database
      vatPercentage: settings.vat_percentage !== null && settings.vat_percentage !== undefined ? parseFloat(settings.vat_percentage) : 0,
      vatEnabled: settings.vat_enabled !== null && settings.vat_enabled !== undefined ? Boolean(settings.vat_enabled) : false,
      letterheadHeightPx: settings.letterhead_height_px || 150,
      topMarginCm: settings.top_margin_cm || 4,
      bottomMarginCm: settings.bottom_margin_cm || 3,
      createdAt: settings.created_at || null,
      updatedAt: settings.updated_at || null
    }
  }
}

const companySettingsService = new CompanySettingsService()
export default companySettingsService
