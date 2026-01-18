import { supabase } from './supabaseClient'
import customersService from './customersService'
import quotationsService from './quotationsService'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'
import userManagementService from './userManagementService'

class ContractsService {
  // Generate contract number
  generateContractNumber() {
    const prefix = 'C'
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `${prefix}-${year}-${random}`
  }

  // Generate contract number from quote number (inheriting numeric ID)
  // Q-YYYY-XXXX -> C-YYYY-XXXX for original
  // Q-YYYY-XXXX -> C-YYYY-XXXX-A1, C-YYYY-XXXX-A2, etc. for amendments
  async generateContractNumberFromQuote(quoteNumber, contractType = 'original', quotationId = null) {
    try {
      // Extract numeric part from quote number (e.g., Q-2024-1001 -> 2024-1001)
      const numericPart = quoteNumber.replace(/^Q-/, '') // Remove Q- prefix
      
      if (contractType === 'original') {
        // For original: Q-2024-1001 -> C-2024-1001
        return `C-${numericPart}`
      } else {
        // For amendment: find the highest addendum number and increment
        // First, get the original contract number (without addendum suffix)
        const baseContractNumber = `C-${numericPart}`
        
        // Get all contracts for this quotation (to find existing addendums)
        let existingContracts = []
        if (quotationId) {
          existingContracts = await this.getContractsByQuotation(quotationId)
        }
        
        // Find all addendums for this base contract number
        const addendumPattern = new RegExp(`^${baseContractNumber}-A(\\d+)$`)
        const addendumNumbers = existingContracts
          .map(contract => {
            const match = contract.contractNumber.match(addendumPattern)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter(num => num > 0)
        
        // Get the next addendum number
        const nextAddendumNumber = addendumNumbers.length > 0 
          ? Math.max(...addendumNumbers) + 1 
          : 1
        
        return `${baseContractNumber}-A${nextAddendumNumber}`
      }
    } catch (error) {
      console.error('Error generating contract number from quote:', error)
      // Fallback to regular generation
      return this.generateContractNumber()
    }
  }

  // Convert Quotation to Contract
  async convertQuotationToContract(quotationId, contractType = 'original', workStartDate = null, clientId = null) {
    try {
      if (!quotationId) {
        return {
          success: false,
          error: 'معرف العرض مطلوب',
          errorCode: 'INVALID_QUOTATION_ID'
        }
      }

      // Validate contractType
      if (!contractType || !['original', 'amendment'].includes(contractType)) {
        return {
          success: false,
          error: 'يرجى اختيار نوع العقد (أصلي أو ملحق)',
          errorCode: 'INVALID_CONTRACT_TYPE'
        }
      }

      // Get quotation
      const quotation = await quotationsService.getQuotation(quotationId)
      if (!quotation) {
        return {
          success: false,
          error: 'العرض غير موجود',
          errorCode: 'QUOTATION_NOT_FOUND'
        }
      }

      // Check if quotation is accepted
      if (quotation.status !== 'accepted') {
        return {
          success: false,
          error: 'يمكن تحويل العروض المقبولة فقط إلى عقود',
          errorCode: 'QUOTATION_NOT_ACCEPTED'
        }
      }

      // Check if contract already exists for this quotation (only for original contracts)
      if (contractType === 'original') {
        const existingContracts = await this.getContractsByQuotation(quotationId)
        if (existingContracts.length > 0) {
          return {
            success: false,
            error: 'تم إنشاء عقد أصلي لهذا العرض مسبقاً',
            errorCode: 'CONTRACT_ALREADY_EXISTS'
          }
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

      // Create contract from quotation (inherit numeric ID from quote number)
      const contractNumber = await this.generateContractNumberFromQuote(
        quotation.quoteNumber,
        contractType,
        quotationId
      )
      
      // MANDATORY BRANCH INJECTION: Explicitly use branchStore (ignore frontend branchId)
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return error if branchId is null
      if (!branchId) {
        return {
          success: false,
          error: 'No branch ID set. Cannot create contract.',
          errorCode: 'NO_BRANCH_ID'
        }
      }
      
      const newContract = {
        tenant_id: tenantId,
        contract_number: contractNumber,
        quotation_id: quotationId,
        customer_id: clientId || quotation.customerId || null, // Use provided clientId first
        customer_name: quotation.customerName,
        customer_phone: quotation.customerPhone,
        contract_type: contractType,
        work_type: quotation.workType,
        total_amount: quotation.totalAmount,
        project_name: quotation.projectName || null,
        start_date: workStartDate || null, // CRITICAL: Use user-selected contract start date from modal, NOT quotation date
        status: 'in_progress',
        notes: `تم إنشاء هذا العقد من العرض ${quotation.quoteNumber}`,
        created_by: 'user',
        branch_id: branchId // MANDATORY: Explicitly set from branchStore (not from frontend)
      }
      
      // Only include customer_email if it exists and is not empty
      if (quotation.customerEmail && quotation.customerEmail.trim() !== '') {
        newContract.customer_email = quotation.customerEmail
      }

      const { data: insertedContract, error } = await supabase
        .from('contracts')
        .insert([newContract])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        contract: await this.getContract(insertedContract.id)
      }
    } catch (error) {
      console.error('Error converting quotation to contract:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحويل العرض إلى عقد',
        errorCode: 'CONVERT_QUOTATION_FAILED'
      }
    }
  }

  // Get all contracts (filtered by current tenant and branch)
  async getContracts() {
    try {
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch contracts.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch contracts.')
        return []
      }

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: contracts, error } = await query.order('created_at', { ascending: false })
      if (error) {
        console.error('[contractsService] Supabase error:', error)
        throw error
      }

      // Fetch contract items for each contract
      const contractsWithItems = await Promise.all(
        (contracts || []).map(async (contract) => {
          const { data: items, error: itemsError } = await supabase
            .from('contract_items')
            .select('*')
            .eq('contract_id', contract.id)
            .order('created_at', { ascending: true })

          if (itemsError) {
            console.error('Error fetching contract items:', itemsError)
            return this.mapToCamelCase(contract, [])
          }

          return this.mapToCamelCase(contract, items || [])
        })
      )

      return contractsWithItems
    } catch (error) {
      console.error('Error fetching contracts:', error.message)
      return []
    }
  }

  // Get contract by ID
  async getContract(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch contract.')
        return null
      }

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch contract.')
        return null
      }

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: contract, error } = await query.single()

      if (error) throw error

      // Fetch contract items
      const { data: items, error: itemsError } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', id)
        .order('created_at', { ascending: true })

      if (itemsError) {
        console.error('Error fetching contract items:', itemsError)
        return this.mapToCamelCase(contract, [])
      }

      return this.mapToCamelCase(contract, items || [])
    } catch (error) {
      console.error('Error fetching contract:', error.message)
      return null
    }
  }

  // Create new contract
  async createContract(contractData) {
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

      const contractNumber = contractData.contractNumber || this.generateContractNumber()

      // Try to find existing customer
      let customerId = contractData.customerId || null
      if (!customerId && contractData.customerEmail) {
        const existingCustomer = await customersService.getCustomerByEmail(contractData.customerEmail)
        if (existingCustomer) {
          customerId = existingCustomer.id
        }
      }

      // Calculate total from items if provided
      let totalAmount = contractData.totalAmount || 0
      if (contractData.items && contractData.items.length > 0) {
        totalAmount = contractData.items.reduce((sum, item) => {
          const itemTotal = item.total || (item.unitPrice * item.quantity) || 0
          return sum + itemTotal
        }, 0)
      }

      // MANDATORY BRANCH INJECTION: Explicitly use branchStore (ignore frontend branchId)
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return error if branchId is null
      if (!branchId) {
        return {
          success: false,
          error: 'No branch ID set. Cannot create contract.',
          errorCode: 'NO_BRANCH_ID'
        }
      }
      
      const newContract = {
        tenant_id: tenantId,
        contract_number: contractNumber,
        quotation_id: contractData.quotationId || null,
        customer_id: customerId,
        customer_name: contractData.customerName,
        customer_phone: contractData.customerPhone,
        contract_type: contractData.contractType || 'original',
        original_contract_id: contractData.originalContractId || null,
        work_type: contractData.workType || 'civil_works',
        total_amount: totalAmount,
        status: contractData.status || 'in_progress',
        start_date: contractData.startDate || null,
        end_date: contractData.endDate || null,
        project_id: contractData.projectId || null,
        project_name: contractData.projectName || null,
        notes: contractData.notes || null,
        created_by: contractData.createdBy || 'user',
        branch_id: branchId // MANDATORY: Explicitly set from branchStore (not from frontend)
      }
      
      // Only include customer_email if it exists and is not empty
      if (contractData.customerEmail && contractData.customerEmail.trim() !== '') {
        newContract.customer_email = contractData.customerEmail
      }

      const { data: insertedContract, error } = await supabase
        .from('contracts')
        .insert([newContract])
        .select()
        .single()

      if (error) throw error

      // Insert contract items if provided
      if (contractData.items && contractData.items.length > 0) {
        const contractItems = contractData.items.map(item => ({
          contract_id: insertedContract.id,
          item_description: item.itemDescription,
          quantity: item.quantity || 1,
          unit_price: item.unitPrice || 0,
          total: item.total || (item.unitPrice * item.quantity) || 0
        }))

        const { error: itemsError } = await supabase
          .from('contract_items')
          .insert(contractItems)

        if (itemsError) {
          // Rollback: delete contract
          await supabase.from('contracts').delete().eq('id', insertedContract.id)
          throw itemsError
        }
      }

      return {
        success: true,
        contract: await this.getContract(insertedContract.id)
      }
    } catch (error) {
      console.error('Error creating contract:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء العقد',
        errorCode: 'CREATE_CONTRACT_FAILED'
      }
    }
  }

  // Update contract
  async updateContract(id, contractData) {
    try {
      // DEBUG: Log received updates

      if (!id) {
        return {
          success: false,
          error: 'معرف العقد مطلوب',
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

      // Create dbPayload object with explicit snake_case mapping
      // This ensures camelCase keys from frontend are properly converted
      const dbPayload = {}
      
      // Map date fields explicitly (critical fix for date persistence)
      // Handle both null and undefined, and ensure proper string format
      if (contractData.startDate !== undefined) {
        // Explicitly set to null if empty/falsy, otherwise ensure it's a string
        if (contractData.startDate === null || contractData.startDate === '') {
          dbPayload.start_date = null
        } else {
          // Handle different date formats: string, moment object, or Date object
          let startDateStr = null
          if (typeof contractData.startDate === 'string') {
            // Already a string - use it directly (should be YYYY-MM-DD format)
            startDateStr = contractData.startDate
          } else if (contractData.startDate && typeof contractData.startDate.format === 'function') {
            // Moment object - use format method
            startDateStr = contractData.startDate.format('YYYY-MM-DD')
          } else if (contractData.startDate instanceof Date) {
            // Date object - format to YYYY-MM-DD
            startDateStr = contractData.startDate.toISOString().split('T')[0]
          } else {
            // Fallback: try to convert to string and extract date part
            startDateStr = String(contractData.startDate).split('T')[0]
          }
          dbPayload.start_date = startDateStr
        }
      }
      
      if (contractData.endDate !== undefined) {
        // Explicitly set to null if empty/falsy, otherwise ensure it's a string
        if (contractData.endDate === null || contractData.endDate === '') {
          dbPayload.end_date = null
        } else {
          // Handle different date formats: string, moment object, or Date object
          let endDateStr = null
          if (typeof contractData.endDate === 'string') {
            // Already a string - use it directly (should be YYYY-MM-DD format)
            endDateStr = contractData.endDate
          } else if (contractData.endDate && typeof contractData.endDate.format === 'function') {
            // Moment object - use format method
            endDateStr = contractData.endDate.format('YYYY-MM-DD')
          } else if (contractData.endDate instanceof Date) {
            // Date object - format to YYYY-MM-DD
            endDateStr = contractData.endDate.toISOString().split('T')[0]
          } else {
            // Fallback: try to convert to string and extract date part
            endDateStr = String(contractData.endDate).split('T')[0]
          }
          dbPayload.end_date = endDateStr
        }
      }
      
      // Map other valid fields (excluding startDate/endDate to avoid duplicates)
      if (contractData.customerName !== undefined) dbPayload.customer_name = contractData.customerName
      if (contractData.customerPhone !== undefined) dbPayload.customer_phone = contractData.customerPhone
      // Only update customer_email if it's provided and not empty
      if (contractData.customerEmail !== undefined) {
        if (contractData.customerEmail && contractData.customerEmail.trim() !== '') {
          dbPayload.customer_email = contractData.customerEmail
        } else {
          dbPayload.customer_email = null
        }
      }
      if (contractData.contractType !== undefined) dbPayload.contract_type = contractData.contractType
      if (contractData.workType !== undefined) dbPayload.work_type = contractData.workType
      if (contractData.totalAmount !== undefined) dbPayload.total_amount = contractData.totalAmount
      if (contractData.status !== undefined) dbPayload.status = contractData.status
      if (contractData.projectId !== undefined) dbPayload.project_id = contractData.projectId
      if (contractData.projectName !== undefined) dbPayload.project_name = contractData.projectName || null
      if (contractData.notes !== undefined) dbPayload.notes = contractData.notes


      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
      }

      let query = supabase
        .from('contracts')
        .update(dbPayload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Error updating contract:', error)
        throw error
      }

      return {
        success: true,
        contract: await this.getContract(id)
      }
    } catch (error) {
      console.error('Error updating contract:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث العقد',
        errorCode: 'UPDATE_CONTRACT_FAILED'
      }
    }
  }

  // Delete contract (3-Layer Security Protocol)
  async deleteContract(id, password, deletionReason) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف العقد مطلوب',
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

      // 🟢 LAYER 1: AUTHORIZATION - Check user role (Permission Check)
      const profile = await userManagementService.getCurrentUserProfile()
      const userRole = profile?.role || null
      const allowedRoles = ['super_admin', 'admin', 'manager', 'owner']
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        return {
          success: false,
          error: 'Access Denied: You do not have permission to delete records.',
          errorCode: 'UNAUTHORIZED'
        }
      }

      // Step 1: Get current user and contract info
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user || !user.email) {
        return {
          success: false,
          error: 'Authentication required',
          errorCode: 'AUTH_REQUIRED'
        }
      }

      // 🟡 LAYER 2: AUTHENTICATION - Verify password (Identity Check)
      if (!password) {
        return {
          success: false,
          error: 'Password is required for deletion',
          errorCode: 'PASSWORD_REQUIRED'
        }
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      })

      if (authError) {
        return {
          success: false,
          error: 'Security Alert: Incorrect Password.',
          errorCode: 'INVALID_PASSWORD'
        }
      }

      // Step 3: Get contract info for audit log and financial checks
      const contract = await this.getContract(id)
      if (!contract) {
        return {
          success: false,
          error: 'Contract not found',
          errorCode: 'CONTRACT_NOT_FOUND'
        }
      }

      // Step 4: Financial Guard - Check for active financial records (payments)
      const branchId = branchStore.getBranchId()
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
      }

      const { count: paymentsCount, error: paymentsError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .eq('contract_id', id)

      if (paymentsError) {
        console.error('Error checking payments:', paymentsError)
      }

      if (paymentsCount && paymentsCount > 0) {
        return {
          success: false,
          error: 'Cannot delete: Active financial records exist for this contract. Please remove all payments first.',
          errorCode: 'FINANCIAL_RECORDS_EXIST',
          paymentsCount: paymentsCount
        }
      }

      // 🔴 LAYER 3: DOCUMENTATION - Audit Logging (MANDATORY - Abort if fails)
      if (!deletionReason || deletionReason.trim() === '') {
        return {
          success: false,
          error: 'Deletion reason is required for audit purposes',
          errorCode: 'REASON_REQUIRED'
        }
      }

      const deletionLog = {
        table_name: 'contracts',
        record_ref_number: contract.contractNumber || id,
        record_id: id,
        deletion_reason: deletionReason.trim(),
        deleted_by: user.id,
        tenant_id: tenantId,
        branch_id: branchId,
        deleted_data: JSON.stringify(contract) // Store snapshot of deleted record
      }

      const { error: logError } = await supabase
        .from('deletion_logs')
        .insert([deletionLog])

      if (logError) {
        console.error('Error logging deletion:', logError)
        return {
          success: false,
          error: 'Deletion aborted: Failed to create audit log. Please contact support.',
          errorCode: 'AUDIT_LOG_FAILED'
        }
      }

      // 🏁 EXECUTION - Only after Layers 1, 2, and 3 pass successfully
      
      // Step 6A: Find Linked Project (Cascade Cleanup)
      let linkedProjectId = null
      let linkedProjectSnapshot = null
      if (contract.projectId) {
        // Contract has a project_id - check if project exists and is linked to this contract
        const { data: linkedProject, error: projectCheckError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', contract.projectId)
          .eq('tenant_id', tenantId)
          .eq('branch_id', branchId)
          .single()

        if (!projectCheckError && linkedProject) {
          linkedProjectId = linkedProject.id
          linkedProjectSnapshot = linkedProject
          console.log(`[Cascade Delete] Found linked project: ${linkedProjectId} for contract: ${id}`)
        }
      }

      // Step 6B: Delete contract items first (cascade should handle this, but being explicit)
      await supabase
        .from('contract_items')
        .delete()
        .eq('contract_id', id)

      // Step 6C: Delete linked project if exists (BEFORE deleting contract to avoid FK issues)
      if (linkedProjectId && linkedProjectSnapshot) {
        try {
          const { error: projectDeleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', linkedProjectId)
            .eq('tenant_id', tenantId)
            .eq('branch_id', branchId)

          if (projectDeleteError) {
            console.error('Error deleting linked project:', projectDeleteError)
            // Log error but continue with contract deletion (non-blocking)
          } else {
            console.log(`[Cascade Delete] Successfully deleted linked project: ${linkedProjectId}`)
            
            // Update audit log deleted_data to include cascade metadata
            try {
              const enhancedDeletedData = {
                ...contract,
                cascade_metadata: {
                  linked_project_deleted: true,
                  project_id: linkedProjectId,
                  project_snapshot: linkedProjectSnapshot
                }
              }
              await supabase
                .from('deletion_logs')
                .update({ deleted_data: JSON.stringify(enhancedDeletedData) })
                .eq('record_id', id)
                .eq('table_name', 'contracts')
            } catch (updateError) {
              console.error('Error updating audit log with cascade metadata:', updateError)
              // Non-blocking - log already created with original data
            }
          }
        } catch (cascadeError) {
          console.error('Error during cascade project deletion:', cascadeError)
          // Continue with contract deletion even if project deletion fails
        }
      }

      // Step 7: Delete contract
      let query = supabase
        .from('contracts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { error } = await query

      if (error) throw error

      return { success: true, linkedProjectDeleted: linkedProjectId !== null, linkedProjectId: linkedProjectId }
    } catch (error) {
      console.error('Error deleting contract:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف العقد',
        errorCode: 'DELETE_CONTRACT_FAILED'
      }
    }
  }

  // Get contracts by quotation
  async getContractsByQuotation(quotationId) {
    try {
      if (!quotationId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch contracts.')
        return []
      }

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('quotation_id', quotationId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(c => this.mapToCamelCase(c, []))
    } catch (error) {
      console.error('Error fetching contracts by quotation:', error.message)
      return []
    }
  }

  // Get contracts by status
  async getContractsByStatus(status) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch contracts.')
        return []
      }

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', status)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map(c => this.mapToCamelCase(c, []))
    } catch (error) {
      console.error('Error fetching contracts by status:', error.message)
      return []
    }
  }

  // Get contracts by project ID (with tenant filter)
  async getContractsByProject(projectId) {
    try {
      if (!projectId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch contracts.')
        return []
      }

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Fetch contract items for each contract
      const contractsWithItems = await Promise.all(
        (data || []).map(async (contract) => {
          const { data: items, error: itemsError } = await supabase
            .from('contract_items')
            .select('*')
            .eq('contract_id', contract.id)
            .order('created_at', { ascending: true })

          if (itemsError) {
            console.error('Error fetching contract items:', itemsError)
            return this.mapToCamelCase(contract, [])
          }

          return this.mapToCamelCase(contract, items || [])
        })
      )

      return contractsWithItems
    } catch (error) {
      console.error('Error fetching contracts by project:', error.message)
      return []
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(contract, items = []) {
    if (!contract) return null

    return {
      id: contract.id,
      contractNumber: contract.contract_number,
      quotationId: contract.quotation_id || null,
      customerId: contract.customer_id || null,
      customerName: contract.customer_name,
      customerPhone: contract.customer_phone,
      customerEmail: contract.customer_email,
      contractType: contract.contract_type,
      originalContractId: contract.original_contract_id || null,
      workType: contract.work_type,
      totalAmount: parseFloat(contract.total_amount) || 0,
      status: contract.status,
      startDate: contract.start_date,
      endDate: contract.end_date,
      projectId: contract.project_id || null,
      projectName: contract.project_name || null,
      items: (items || []).map(item => ({
        id: item.id,
        itemDescription: item.item_description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unit_price) || 0,
        total: parseFloat(item.total) || 0
      })),
      notes: contract.notes,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
      createdBy: contract.created_by
    }
  }
}

const contractsService = new ContractsService()
export default contractsService
