import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class QuotationTemplatesService {
  // Get all templates for current tenant
  async getTemplates(templateType = null) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch templates.')
        return []
      }

      let query = supabase
        .from('quotation_templates')
        .select('*')
        .eq('tenant_id', tenantId)

      if (templateType) {
        query = query.eq('template_type', templateType)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching templates from database:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        throw error
      }

      console.log(`Successfully fetched ${data?.length || 0} templates (type: ${templateType || 'all'})`)
      return (data || []).map(template => this.mapToCamelCase(template))
    } catch (error) {
      console.error('Error fetching templates:', error.message)
      console.error('Full error object:', error)
      return []
    }
  }

  // Get default template for a specific type
  async getDefaultTemplate(templateType) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch default template.')
        return null
      }

      const { data, error } = await supabase
        .from('quotation_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .eq('is_default', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No default template found
          return null
        }
        throw error
      }

      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching default template:', error.message)
      return null
    }
  }

  // Get all default templates (one per type)
  async getAllDefaultTemplates() {
    try {
      const types = ['introduction', 'scope', 'exclusion', 'facility', 'terms']
      const defaults = {}

      for (const type of types) {
        const template = await this.getDefaultTemplate(type)
        if (template) {
          defaults[type] = template
        }
      }

      return defaults
    } catch (error) {
      console.error('Error fetching all default templates:', error.message)
      return {}
    }
  }

  // Create template
  async createTemplate(templateData) {
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

      // If this is set as default, unset other defaults of the same type
      if (templateData.isDefault) {
        await this.unsetOtherDefaults(templateData.templateType)
      }

      // Content should be an object for JSONB column: { scopeOfWork: [...], exclusions: [...] }
      // If content is a string (legacy), try to parse it; otherwise use as-is
      let contentValue = templateData.content
      if (!contentValue) {
        contentValue = {}
      } else if (typeof contentValue === 'string') {
        // Try to parse string as JSON (legacy format)
        try {
          contentValue = JSON.parse(contentValue)
        } catch (e) {
          // If parsing fails, use empty object
          contentValue = {}
        }
      }
      // If it's already an object, Supabase will handle JSONB serialization

      const newTemplate = {
        tenant_id: tenantId,
        template_name: templateData.templateName || '',
        template_type: templateData.templateType,
        content: contentValue, // Pass as object for JSONB column
        is_default: templateData.isDefault || false
      }

      const { data, error } = await supabase
        .from('quotation_templates')
        .insert([newTemplate])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        template: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error creating template:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to create template',
        errorCode: 'CREATE_TEMPLATE_FAILED'
      }
    }
  }

  // Update template
  async updateTemplate(id, templateData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Template ID is required',
          errorCode: 'INVALID_ID'
        }
      }

      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      // If this is set as default, unset other defaults of the same type
      if (templateData.isDefault) {
        await this.unsetOtherDefaults(templateData.templateType, id)
      }

      const updateData = {}
      if (templateData.templateName !== undefined) updateData.template_name = templateData.templateName
      if (templateData.templateType !== undefined) updateData.template_type = templateData.templateType
      if (templateData.content !== undefined) updateData.content = templateData.content
      if (templateData.isDefault !== undefined) updateData.is_default = templateData.isDefault

      const { data, error } = await supabase
        .from('quotation_templates')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        template: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating template:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to update template',
        errorCode: 'UPDATE_TEMPLATE_FAILED'
      }
    }
  }

  // Delete template
  async deleteTemplate(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Template ID is required',
          errorCode: 'INVALID_ID'
        }
      }

      const tenantId = tenantStore.getTenantId()
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        return {
          success: false,
          error: tenantValidation.error || 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      const { error } = await supabase
        .from('quotation_templates')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting template:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to delete template',
        errorCode: 'DELETE_TEMPLATE_FAILED'
      }
    }
  }

  // Helper: Unset other defaults of the same type
  async unsetOtherDefaults(templateType, excludeId = null) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return

      let query = supabase
        .from('quotation_templates')
        .update({ is_default: false })
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .eq('is_default', true)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      await query
    } catch (error) {
      console.error('Error unsetting other defaults:', error.message)
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(template) {
    if (!template) return null

    return {
      id: template.id,
      tenantId: template.tenant_id,
      templateName: template.template_name,
      templateType: template.template_type || null, // Map template_type (DB) to templateType (frontend)
      content: template.content,
      isDefault: template.is_default,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }
  }
}

const quotationTemplatesService = new QuotationTemplatesService()
export default quotationTemplatesService
