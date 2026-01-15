import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class QuotationDraftsService {
  // Generate reference number in format REF-YYYY-XXX (e.g., REF-2026-001)
  async generateRefNumber() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot generate reference number.')
        return `REF-${new Date().getFullYear()}-001`
      }

      const year = new Date().getFullYear()
      const prefix = `REF-${year}-`

      // Get the highest existing reference number for this year and tenant
      const { data, error } = await supabase
        .from('quotation_drafts')
        .select('ref_number')
        .eq('tenant_id', tenantId)
        .not('ref_number', 'is', null)
        .like('ref_number', `${prefix}%`)
        .order('ref_number', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching existing reference numbers:', error)
        // Fallback to timestamp-based number
        const timestamp = Date.now().toString().slice(-3)
        return `${prefix}${timestamp.padStart(3, '0')}`
      }

      if (data && data.length > 0 && data[0]?.ref_number) {
        // Extract the number part and increment
        const refNumber = data[0].ref_number
        const match = refNumber.match(new RegExp(`${prefix}(\\d+)`))
        if (match && match[1]) {
          const nextNumber = parseInt(match[1], 10) + 1
          return `${prefix}${nextNumber.toString().padStart(3, '0')}`
        }
      }

      // If no existing reference, start with 001
      return `${prefix}001`
    } catch (error) {
      console.error('Error generating reference number:', error)
      // Fallback
      const year = new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-3)
      return `REF-${year}-${timestamp.padStart(3, '0')}`
    }
  }

  // Get all quotation drafts for current tenant
  async getQuotationDrafts() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch quotation drafts.')
        return []
      }

      const { data, error } = await supabase
        .from('quotation_drafts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return (data || []).map(draft => this.mapToCamelCase(draft))
    } catch (error) {
      console.error('Error fetching quotation drafts:', error.message)
      return []
    }
  }

  // Get quotation draft by ID
  async getQuotationDraft(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch quotation draft.')
        return null
      }

      const { data, error } = await supabase
        .from('quotation_drafts')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      return this.mapToCamelCase(data)
    } catch (error) {
      console.error('Error fetching quotation draft:', error.message)
      return null
    }
  }

  // Create new quotation draft
  async createQuotationDraft(draftData) {
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

      // Calculate BOQ total
      const boqTotal = (draftData.boqItems || []).reduce((sum, item) => {
        return sum + (parseFloat(item.amount) || 0)
      }, 0)

      const newDraft = {
        tenant_id: tenantId,
        draft_name: draftData.draftName || null,
        customer_id: draftData.customerId || null,
        customer_name: draftData.customerName || '',
        customer_phone: draftData.customerPhone || null,
        customer_email: draftData.customerEmail || null,
        project_id: draftData.projectId || null,
        project_name: draftData.projectName || null,
        subject: draftData.subject || null,
        ref_number: draftData.refNumber || null,
        quotation_date: draftData.quotationDate || new Date().toISOString().split('T')[0],
        header_data: draftData.headerData || {},
        boq_items: draftData.boqItems || [],
        boq_total: boqTotal,
        introduction_text: draftData.introductionText || null,
        scope_of_work: draftData.scopeOfWork || [],
        exclusions: draftData.exclusions || [],
        facilities: draftData.facilities || [],
        terms_and_conditions: draftData.termsAndConditions || null,
        payment_milestones: draftData.paymentMilestones || [],
        validity_period: draftData.validityPeriod || null,
        status: draftData.status || 'draft',
        notes: draftData.notes || null,
        include_letterhead: draftData.includeLetterhead !== undefined ? draftData.includeLetterhead : true,
        include_signature: draftData.includeSignature !== undefined ? draftData.includeSignature : true,
        manager_notes: draftData.managerNotes || null
        // created_by is handled by database default (auth.uid()) or RLS policy
        // Do NOT set it to 'user' string as it causes UUID validation errors
        // Removed created_by field to let database handle it via default value
      }

      const { data, error } = await supabase
        .from('quotation_drafts')
        .insert([newDraft])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        draft: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error creating quotation draft:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to create quotation draft',
        errorCode: 'CREATE_DRAFT_FAILED'
      }
    }
  }

  // Update quotation draft
  async updateQuotationDraft(id, draftData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Draft ID is required',
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

      // Calculate BOQ total if boqItems are provided
      let boqTotal = null
      if (draftData.boqItems !== undefined) {
        boqTotal = (draftData.boqItems || []).reduce((sum, item) => {
          return sum + (parseFloat(item.amount) || 0)
        }, 0)
      }

      const updateData = {}
      if (draftData.draftName !== undefined) updateData.draft_name = draftData.draftName
      if (draftData.customerId !== undefined) updateData.customer_id = draftData.customerId || null
      if (draftData.customerName !== undefined) updateData.customer_name = draftData.customerName
      if (draftData.customerPhone !== undefined) updateData.customer_phone = draftData.customerPhone || null
      if (draftData.customerEmail !== undefined) updateData.customer_email = draftData.customerEmail || null
      if (draftData.projectId !== undefined) updateData.project_id = draftData.projectId || null
      if (draftData.projectName !== undefined) updateData.project_name = draftData.projectName || null
      if (draftData.subject !== undefined) updateData.subject = draftData.subject || null
      if (draftData.refNumber !== undefined) updateData.ref_number = draftData.refNumber || null
      if (draftData.quotationDate !== undefined) updateData.quotation_date = draftData.quotationDate
      if (draftData.headerData !== undefined) updateData.header_data = draftData.headerData
      if (draftData.boqItems !== undefined) updateData.boq_items = draftData.boqItems
      if (boqTotal !== null) updateData.boq_total = boqTotal
      if (draftData.introductionText !== undefined) updateData.introduction_text = draftData.introductionText || null
      if (draftData.scopeOfWork !== undefined) updateData.scope_of_work = draftData.scopeOfWork
      if (draftData.exclusions !== undefined) updateData.exclusions = draftData.exclusions
      if (draftData.facilities !== undefined) updateData.facilities = draftData.facilities
      if (draftData.termsAndConditions !== undefined) updateData.terms_and_conditions = draftData.termsAndConditions || null
      if (draftData.paymentMilestones !== undefined) updateData.payment_milestones = draftData.paymentMilestones
      if (draftData.validityPeriod !== undefined) updateData.validity_period = draftData.validityPeriod || null
      if (draftData.status !== undefined) updateData.status = draftData.status
      if (draftData.notes !== undefined) updateData.notes = draftData.notes || null
      if (draftData.includeLetterhead !== undefined) updateData.include_letterhead = draftData.includeLetterhead
      if (draftData.includeSignature !== undefined) updateData.include_signature = draftData.includeSignature
      if (draftData.managerNotes !== undefined) updateData.manager_notes = draftData.managerNotes || null

      const { data, error } = await supabase
        .from('quotation_drafts')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        draft: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating quotation draft:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to update quotation draft',
        errorCode: 'UPDATE_DRAFT_FAILED'
      }
    }
  }

  // Delete quotation draft
  async deleteQuotationDraft(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Draft ID is required',
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
        .from('quotation_drafts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting quotation draft:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to delete quotation draft',
        errorCode: 'DELETE_DRAFT_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(draft) {
    if (!draft) return null

    return {
      id: draft.id,
      tenantId: draft.tenant_id,
      draftName: draft.draft_name,
      customerId: draft.customer_id,
      customerName: draft.customer_name,
      customerPhone: draft.customer_phone,
      customerEmail: draft.customer_email,
      projectId: draft.project_id,
      projectName: draft.project_name,
      subject: draft.subject,
      refNumber: draft.ref_number || null, // Map ref_number (DB) to refNumber (frontend)
      quotationDate: draft.quotation_date,
      headerData: draft.header_data || {},
      boqItems: draft.boq_items || [],
      boqTotal: parseFloat(draft.boq_total) || 0,
      introductionText: draft.introduction_text,
      scopeOfWork: draft.scope_of_work || [],
      exclusions: draft.exclusions || [],
      facilities: draft.facilities || [],
      termsAndConditions: draft.terms_and_conditions,
      paymentMilestones: draft.payment_milestones || [],
      validityPeriod: draft.validity_period,
      status: draft.status,
      notes: draft.notes,
      includeLetterhead: draft.include_letterhead !== undefined ? draft.include_letterhead : true,
      includeSignature: draft.include_signature !== undefined ? draft.include_signature : true,
      managerNotes: draft.manager_notes || null,
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
      createdBy: draft.created_by
    }
  }
}

const quotationDraftsService = new QuotationDraftsService()
export default quotationDraftsService
