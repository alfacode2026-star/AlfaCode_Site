import { supabase } from './supabaseClient'
import customersService from './customersService'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'
import projectsService from './projectsService'
import contractsService from './contractsService'

class QuotationsService {
  // Generate quote number
  generateQuoteNumber() {
    const prefix = 'Q'
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `${prefix}-${year}-${random}`
  }

  // Get all quotations (filtered by current tenant)
  async getQuotations() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch quotations.')
        return []
      }

      const { data: quotations, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (quotations || []).map(q => this.mapToCamelCase(q))
    } catch (error) {
      console.error('Error fetching quotations:', error.message)
      return []
    }
  }

  // Get quotation by ID
  async getQuotation(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch quotation.')
        return null
      }

      const { data: quotation, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      return this.mapToCamelCase(quotation)
    } catch (error) {
      console.error('Error fetching quotation:', error.message)
      return null
    }
  }

  // Get current user ID from Supabase session
  async getCurrentUserId() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        return null
      }
      return user.id
    } catch (error) {
      console.warn('Error getting current user:', error.message)
      return null
    }
  }

  // Get tenant_id from current user session metadata
  async getTenantIdFromSession() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        return null
      }
      // Check user_metadata first, then app_metadata
      const tenantId = user.user_metadata?.tenant_id || user.app_metadata?.tenant_id
      return tenantId || null
    } catch (error) {
      console.warn('Error getting tenant_id from session:', error.message)
      return null
    }
  }

  // Fallback: Get first tenant from tenants table
  async getTenantIdFromDatabase() {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single()
      
      if (error || !data) {
        console.warn('No tenants found in database')
        return null
      }
      
      return data.id
    } catch (error) {
      console.warn('Error fetching tenant from database:', error.message)
      return null
    }
  }

  // Get tenant_id with fallback mechanism
  async getTenantIdWithFallback() {
    // 1. Try tenantStore first
    let tenantId = tenantStore.getTenantId()
    if (tenantId && validateTenantId(tenantId).valid) {
      return tenantId
    }

    // 2. Try from quotationData if provided
    // (This will be handled in createQuotation)

    // 3. Try from user session metadata
    tenantId = await this.getTenantIdFromSession()
    if (tenantId && validateTenantId(tenantId).valid) {
      // Update tenantStore for future use
      tenantStore.setTenantId(tenantId)
      return tenantId
    }

    // 4. Fallback: Get from tenants table
    tenantId = await this.getTenantIdFromDatabase()
    if (tenantId && validateTenantId(tenantId).valid) {
      // Update tenantStore for future use
      tenantStore.setTenantId(tenantId)
      return tenantId
    }

    return null
  }

  // Create new quotation
  async createQuotation(quotationData) {
    try {
      // Get tenant_id with fallback mechanism (optional - will be omitted if not available)
      let tenantId = quotationData.tenantId || tenantStore.getTenantId()
      
      // If still missing, try fallback mechanisms
      if (!tenantId || !validateTenantId(tenantId).valid) {
        tenantId = await this.getTenantIdWithFallback()
      }

      // tenant_id is optional - if not valid, we'll omit it from the insert
      // The database should handle this gracefully if RLS policies allow it
      const tenantValidation = validateTenantId(tenantId)
      if (!tenantValidation.valid) {
        console.warn('⚠️ No valid tenant_id available. Proceeding without tenant_id. Database should handle this if RLS allows.')
        tenantId = null // Will be omitted from insert
      }

      // Generate quote number if not provided
      const quoteNumber = quotationData.quoteNumber || this.generateQuoteNumber()

      // Try to find existing customer
      let customerId = quotationData.customerId || null
      if (!customerId && quotationData.customerEmail) {
        const existingCustomer = await customersService.getCustomerByEmail(quotationData.customerEmail)
        if (existingCustomer) {
          customerId = existingCustomer.id
        }
      }

      // Get current user ID from session, or use provided createdBy (optional)
      // created_by is optional - will be omitted if not available
      let createdBy = quotationData.createdBy
      if (!createdBy || createdBy === 'user') {
        createdBy = await this.getCurrentUserId()
      }
      
      // Build quotation object - tenant_id and created_by are optional
      const newQuotation = {
        quote_number: quoteNumber,
        customer_id: customerId,
        customer_name: quotationData.customerName,
        customer_phone: quotationData.customerPhone,
        customer_email: quotationData.customerEmail || null,
        project_name: quotationData.projectName || null,
        document_type: quotationData.documentType || 'original',
        work_type: quotationData.workType || 'civil_works', // Default fallback, but work scopes define the actual work
        work_scopes: quotationData.workScopes && Array.isArray(quotationData.workScopes) ? quotationData.workScopes : null,
        total_amount: quotationData.totalAmount || 0,
        status: quotationData.status || 'draft',
        valid_until: quotationData.validUntil || null,
        notes: quotationData.notes || null
      }
      
      // Only add tenant_id if we have a valid one (optional)
      if (tenantId && validateTenantId(tenantId).valid) {
        newQuotation.tenant_id = tenantId
      }
      
      // Only add created_by if we have a valid UUID (optional)
      if (createdBy && createdBy !== 'user') {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(createdBy)) {
          newQuotation.created_by = createdBy
        }
        // If invalid UUID format, omit the field - database should handle this gracefully
      }
      // If createdBy is null or 'user', omit the field - database should handle this gracefully


      // Try/catch around insert to catch and alert exact Supabase error
      try {
        const { data: insertedQuotation, error } = await supabase
          .from('quotations')
          .insert([newQuotation])
          .select()
          .single()

        if (error) {
          // Alert the exact error message from Supabase
          const errorMessage = error.message || JSON.stringify(error)
          const errorDetails = error.details ? `\nDetails: ${error.details}` : ''
          const errorHint = error.hint ? `\nHint: ${error.hint}` : ''
          const fullError = `Supabase Error: ${errorMessage}${errorDetails}${errorHint}`
          
          alert(fullError)
          throw error
        }

        return {
          success: true,
          quotation: this.mapToCamelCase(insertedQuotation)
        }
      } catch (insertError) {
        // Alert the exact error message from Supabase
        const errorMessage = insertError.message || JSON.stringify(insertError)
        const errorDetails = insertError.details ? `\nDetails: ${insertError.details}` : ''
        const errorHint = insertError.hint ? `\nHint: ${insertError.hint}` : ''
        const fullError = `Supabase Insert Error: ${errorMessage}${errorDetails}${errorHint}`
        
        alert(fullError)
        throw insertError
      }
    } catch (error) {
      console.error('Error creating quotation:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء العرض',
        errorCode: 'CREATE_QUOTATION_FAILED'
      }
    }
  }

  // Update quotation
  async updateQuotation(id, quotationData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف العرض مطلوب',
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

      // Get the current quotation to check if status is changing to 'accepted'
      const { data: currentQuotation } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      const updateData = {}
      if (quotationData.customerId !== undefined) updateData.customer_id = quotationData.customerId || null
      if (quotationData.customerName !== undefined) updateData.customer_name = quotationData.customerName
      if (quotationData.customerPhone !== undefined) updateData.customer_phone = quotationData.customerPhone
      if (quotationData.customerEmail !== undefined) updateData.customer_email = quotationData.customerEmail || null
      if (quotationData.projectName !== undefined) updateData.project_name = quotationData.projectName || null
      if (quotationData.documentType !== undefined) updateData.document_type = quotationData.documentType || 'original'
      if (quotationData.workType !== undefined) updateData.work_type = quotationData.workType
      // If workType not provided but workScopes are, keep existing work_type (it's now derived from scopes)
      if (quotationData.workScopes !== undefined) {
        updateData.work_scopes = quotationData.workScopes && Array.isArray(quotationData.workScopes) ? quotationData.workScopes : null
      }
      if (quotationData.totalAmount !== undefined) updateData.total_amount = quotationData.totalAmount
      if (quotationData.status !== undefined) updateData.status = quotationData.status
      if (quotationData.validUntil !== undefined) updateData.valid_until = quotationData.validUntil || null
      if (quotationData.notes !== undefined) updateData.notes = quotationData.notes || null

      const { data, error } = await supabase
        .from('quotations')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      // Check if status changed to 'approved' or 'converted' and auto-create customer if needed
      const wasApproved = currentQuotation?.status === 'approved'
      const wasConverted = currentQuotation?.status === 'converted'
      const isNowApproved = quotationData.status === 'approved'
      const isNowConverted = quotationData.status === 'converted'
      
      // STRICT CUSTOMER CREATION: When quotation is approved, MUST trigger INSERT if customer_name doesn't exist
      // Do not just link them; create a full record with type: 'customer'
      if ((!wasApproved && isNowApproved) || (!wasConverted && isNowConverted)) {
        const mappedQuotation = this.mapToCamelCase(data)
        const customerName = mappedQuotation.customerName
        const customerPhone = mappedQuotation.customerPhone
        const customerEmail = mappedQuotation.customerEmail
        
        if (customerName) {
          try {
            // STRICT CHECK: Only check if a customer with this exact name AND type='customer' exists
            // We MUST create a new customer record if it doesn't exist, regardless of other types
            let existingCustomerWithType = null
            if (customerName) {
              const allCustomers = await customersService.getCustomers()
              // Only match if name matches AND type is 'customer' or 'client'
              existingCustomerWithType = allCustomers.find(c => 
                c.name?.toLowerCase() === customerName.toLowerCase() &&
                (c.type === 'customer' || c.type === 'client')
              )
            }
            
            // If customer with type='customer' doesn't exist, MUST create it
            if (!existingCustomerWithType) {
              // Generate email if missing
              const finalEmail = customerEmail || `${customerName.replace(/\s/g, '').toLowerCase()}@customer.local`
              
              const newCustomerData = {
                name: customerName,
                phone: customerPhone || '',
                email: finalEmail,
                type: 'customer', // MUST be type: 'customer'
                status: 'active'
              }
              
              const createResult = await customersService.addCustomer(newCustomerData)
              if (createResult.success && createResult.customer) {
                // Update quotation with new customer_id
                const { error: updateError } = await supabase
                  .from('quotations')
                  .update({ customer_id: createResult.customer.id })
                  .eq('id', id)
                  .eq('tenant_id', tenantId)
                
                if (updateError) {
                  console.error('Failed to link customer_id to quotation:', updateError)
                } else {
                  // Update the mapped quotation data to include customer_id
                  mappedQuotation.customerId = createResult.customer.id
                }
              } else {
                console.error('❌ STRICT CUSTOMER CREATION: Failed to create customer:', createResult.error)
                throw new Error(`Failed to create customer record: ${createResult.error || 'Unknown error'}`)
              }
            } else {
              // Customer with type='customer' exists - link it to quotation
              if (!mappedQuotation.customerId || mappedQuotation.customerId !== existingCustomerWithType.id) {
                const { error: updateError } = await supabase
                  .from('quotations')
                  .update({ customer_id: existingCustomerWithType.id })
                  .eq('id', id)
                  .eq('tenant_id', tenantId)
                
                if (!updateError) {
                  mappedQuotation.customerId = existingCustomerWithType.id
                }
              }
            }
          } catch (customerError) {
            console.error('❌ STRICT CUSTOMER CREATION: Error creating customer for quotation:', customerError)
            // Throw error to fail the quotation update if customer creation fails
            throw new Error(`Failed to create customer record for approved quotation: ${customerError.message}`)
          }
        }
      }
      
      // Check if status changed to 'converted' and automatically convert to project and contract in one transaction
      if (!wasConverted && isNowConverted) {
        // Automatically convert to project (which also creates contract in one transaction)
        // Update quotation status to 'converted' first before conversion
        const mappedQuotationForConversion = this.mapToCamelCase(data)
        const convertedProject = await this.convertToProject(mappedQuotationForConversion)
        if (convertedProject.success) {
          return {
            success: true,
            quotation: this.mapToCamelCase(data),
            projectCreated: true,
            contractCreated: convertedProject.contractCreated || false,
            project: convertedProject.project,
            contract: convertedProject.contract || null,
            contractError: convertedProject.contractCreated === false ? 'Failed to create contract' : null
          }
        } else {
          // Rollback: revert status if conversion failed
          try {
            await supabase
              .from('quotations')
              .update({ status: currentQuotation?.status || 'draft' })
              .eq('id', id)
              .eq('tenant_id', tenantId)
          } catch (rollbackError) {
            console.error('Failed to rollback quotation status:', rollbackError)
          }
          return {
            success: false,
            error: convertedProject.error || 'فشل في تحويل العرض إلى مشروع وعقد',
            projectCreated: false,
            contractCreated: false,
            projectError: convertedProject.error
          }
        }
      }

      return {
        success: true,
        quotation: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating quotation:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث العرض',
        errorCode: 'UPDATE_QUOTATION_FAILED'
      }
    }
  }

  // Delete quotation
  async deleteQuotation(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف العرض مطلوب',
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
        .from('quotations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting quotation:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف العرض',
        errorCode: 'DELETE_QUOTATION_FAILED'
      }
    }
  }

  // Get quotations by status
  async getQuotationsByStatus(status) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch quotations.')
        return []
      }

      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(q => this.mapToCamelCase(q))
    } catch (error) {
      console.error('Error fetching quotations by status:', error.message)
      return []
    }
  }

  // Convert quotation to project when status is 'converted'
  // Creates both Project AND Contract in one transaction
  async convertToProject(quotationData) {
    try {
      if (!quotationData || quotationData.status !== 'converted') {
        return {
          success: false,
          error: 'Quotation must be set to converted status to create project and contract',
          errorCode: 'QUOTATION_NOT_CONVERTED'
        }
      }

      // Check if project already exists for this quotation
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return {
          success: false,
          error: 'No tenant ID available',
          errorCode: 'NO_TENANT_ID'
        }
      }

      // Check if project already exists with this quotation_id
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('quotation_id', quotationData.id)
        .eq('tenant_id', tenantId)
        .single()

      if (existingProject) {
        return {
          success: false,
          error: 'Project already exists for this quotation',
          errorCode: 'PROJECT_ALREADY_EXISTS'
        }
      }

      // Create project from quotation data
      const projectData = {
        name: quotationData.projectName || `Project from ${quotationData.quoteNumber}`,
        clientId: quotationData.customerId || null,
        budget: quotationData.totalAmount || 0,
        workScopes: quotationData.workScopes || [],
        quotationId: quotationData.id,
        status: 'active',
        completionPercentage: 0
      }

      // Step 1: Create project from quotation data
      const projectResult = await projectsService.addProject(projectData)
      if (!projectResult.success) {
        return projectResult
      }

      // Step 2: AUTOMATICALLY create Contract record in the 'contracts' table
      // Get quotation items if they exist (quotations may have items stored separately)
      // Generate contract number from quote number (inherit numeric ID)
      const contractType = quotationData.documentType === 'addendum' ? 'amendment' : 'original'
      const contractNumber = await contractsService.generateContractNumberFromQuote(
        quotationData.quoteNumber,
        contractType,
        quotationData.id
      )
      
      const contractData = {
        quotationId: quotationData.id,
        contractNumber: contractNumber, // Use inherited contract number
        customerId: quotationData.customerId || null,
        customerName: quotationData.customerName,
        customerPhone: quotationData.customerPhone,
        customerEmail: quotationData.customerEmail || null,
        contractType: contractType,
        workType: quotationData.workType || 'civil_works',
        totalAmount: quotationData.totalAmount || 0,
        projectId: projectResult.project.id,
        projectName: quotationData.projectName || projectResult.project.name,
        status: 'in_progress',
        notes: `تم إنشاء هذا العقد من العرض ${quotationData.quoteNumber}`,
        createdBy: 'user'
        // Note: contract_items would need to be added separately if quotations have items
      }

      // Step 2: AUTOMATICALLY create Contract record in one transaction
      // If contract creation fails, rollback the project creation
      const contractResult = await contractsService.createContract(contractData)
      if (!contractResult.success) {
        // Rollback: Delete the project if contract creation failed
        try {
          await projectsService.deleteProject(projectResult.project.id)
          console.error('Rolled back project creation due to contract creation failure')
        } catch (rollbackError) {
          console.error('Failed to rollback project creation:', rollbackError)
        }
        return {
          success: false,
          error: contractResult.error || 'فشل في إنشاء العقد',
          contractCreated: false,
          errorCode: 'CONTRACT_CREATION_FAILED'
        }
      }

      // Step 3: Status is already set to 'converted' in updateQuotation, no need to update again

      return {
        success: true,
        project: projectResult.project,
        contract: contractResult.success ? contractResult.contract : null,
        contractCreated: contractResult.success
      }
    } catch (error) {
      console.error('Error converting quotation to project:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحويل العرض إلى مشروع',
        errorCode: 'CONVERT_TO_PROJECT_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(quotation) {
    if (!quotation) return null

    return {
      id: quotation.id,
      quoteNumber: quotation.quote_number,
      customerId: quotation.customer_id || null,
      customerName: quotation.customer_name,
      customerPhone: quotation.customer_phone,
      customerEmail: quotation.customer_email,
      projectName: quotation.project_name || null,
      documentType: quotation.document_type || 'original',
      workType: quotation.work_type,
      workScopes: quotation.work_scopes || [],
      totalAmount: parseFloat(quotation.total_amount) || 0,
      status: quotation.status === 'converted' ? 'converted' : quotation.status, // Support 'converted' status
      validUntil: quotation.valid_until,
      notes: quotation.notes,
      createdAt: quotation.created_at,
      updatedAt: quotation.updated_at,
      createdBy: quotation.created_by
    }
  }
}

const quotationsService = new QuotationsService()
export default quotationsService
