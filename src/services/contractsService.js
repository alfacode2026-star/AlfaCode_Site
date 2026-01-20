import { supabase } from './supabaseClient'
import customersService from './customersService'
import quotationsService from './quotationsService'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'
import userManagementService from './userManagementService'
import logsService from './logsService'

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
  async convertQuotationToContract(quotationId, contractType = 'original', customStartDate = null, clientId = null) {
    try {
      console.log('🚀 Starting Conversion. Date:', customStartDate)
      
      // Validate inputs
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

      // 1. Fetch Quotation Data
      const { data: quotation, error: qError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single()

      if (qError || !quotation) {
        return {
          success: false,
          error: 'العرض غير موجود',
          errorCode: 'QUOTATION_NOT_FOUND'
        }
      }

      // Check if quotation is accepted/converted
      if (quotation.status !== 'accepted' && quotation.status !== 'converted') {
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

      // Create contract from quotation (inherit numeric ID from quote number)
      const contractNumber = await this.generateContractNumberFromQuote(
        quotation.quote_number || quotation.quoteNumber,
        contractType,
        quotationId
      )

      // 2. Prepare Date (Force User Input)
      let finalDate = null
      if (customStartDate) {
        if (typeof customStartDate === 'string') {
          // Already a string, validate format
          if (customStartDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            finalDate = customStartDate
          } else {
            // Try to parse and format
            finalDate = new Date(customStartDate).toISOString().split('T')[0]
          }
        } else {
          // Date object or moment, convert to string
          finalDate = new Date(customStartDate).toISOString().split('T')[0]
        }
      }
      
      // Fallback to today only if NO date was provided
      if (!finalDate) {
        finalDate = new Date().toISOString().split('T')[0]
      }

      console.log('📅 Converting with Final Date:', finalDate)

      // 3. Create Contract
      const contractData = {
        tenant_id: tenantId,
        branch_id: branchId, // MANDATORY: Explicitly set from branchStore (not from frontend)
        contract_number: contractNumber,
        quotation_id: quotationId,
        customer_id: clientId || quotation.customer_id || null,
        customer_name: quotation.customer_name || quotation.customerName || '',
        customer_phone: quotation.customer_phone || quotation.customerPhone || '',
        contract_type: contractType,
        work_type: quotation.work_type || quotation.workType || null,
        total_amount: quotation.total_amount || quotation.totalAmount || 0,
        project_name: quotation.project_name || quotation.projectName || null,
        contract_date: finalDate, // FORCE: Use user-selected date
        start_date: finalDate,    // FORCE: Use user-selected date
        status: 'in_progress',
        notes: `تم إنشاء هذا العقد من العرض ${quotation.quote_number || quotation.quoteNumber}`,
        created_by: 'user'
      }
      
      // Only include customer_email if it exists and is not empty
      const customerEmail = quotation.customer_email || quotation.customerEmail
      if (customerEmail && customerEmail.trim() !== '') {
        contractData.customer_email = customerEmail.trim()
      }

      const { data: newContract, error: cError } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single()

      if (cError) {
        console.error('❌ Contract insertion error:', cError)
        throw cError
      }

      console.log('✅ Contract created successfully:', newContract.id)

      // 4. SMART PROJECT HANDLING (CRITICAL FIX: Eliminate Duplicates & Force Dates)
      // BUG FIX: Use maybeSingle() first to check if a project exists, then handle accordingly
      // This prevents duplicate creation when called from single-button conversion flow
      
      // Step 1: Check if a project already exists for this quotation (to avoid double entry)
      const { data: existingProject, error: projectCheckError } = await supabase
        .from('projects')
        .select('id, work_start_date, start_date')
        .eq('quotation_id', quotationId)
        .eq('branch_id', branchId) // MANDATORY: Only find projects in the same branch
        .eq('tenant_id', tenantId) // MANDATORY: Only find projects in the same tenant
        .maybeSingle() // Use maybeSingle() to handle 0 or 1 result gracefully

      if (projectCheckError && projectCheckError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.warn('⚠️ Error checking for existing project:', projectCheckError)
      }

      // Step 1b: Also check for ALL projects (in case duplicates exist from previous runs)
      const { data: allExistingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('quotation_id', quotationId)
        .eq('branch_id', branchId)
        .eq('tenant_id', tenantId)

      // Step 2: Cleanup - Delete duplicates if more than one exists
      if (allExistingProjects && allExistingProjects.length > 1) {
        console.warn(`⚠️ Found ${allExistingProjects.length} duplicate projects for quotation ${quotationId}. Deleting extras...`)
        
        // Keep the first one (or the one we found with maybeSingle), delete the rest
        const mainProjectId = existingProject?.id || allExistingProjects[0].id
        const idsToDelete = allExistingProjects
          .filter(p => p.id !== mainProjectId)
          .map(p => p.id)
        
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .in('id', idsToDelete)
            .eq('branch_id', branchId) // MANDATORY: Ensure branch isolation
            .eq('tenant_id', tenantId) // MANDATORY: Ensure tenant isolation
          
          if (deleteError) {
            console.error('❌ Failed to delete duplicate projects:', deleteError)
            // Continue anyway - we'll try to update the remaining ones
          } else {
            console.log(`✅ Deleted ${idsToDelete.length} duplicate project(s)`)
          }
        }
      }

      // Step 3: Update or Create project with dates
      if (existingProject) {
        // SCENARIO A: Project exists (created by QuotationsPage or previous conversion). UPDATE IT.
        const mainProjectId = existingProject.id
        console.log('🔄 Project already exists, linking to contract and updating date...', mainProjectId)
        
        // Update BOTH date columns to ensure dates are set
        // Also link the project to the contract if not already linked
        // Note: Some tables use start_date, others use work_start_date
        const updateData = {
          work_start_date: finalDate, // Primary date column
          status: 'active'
        }
        
        // Try to set start_date as well (if column exists, will be set; if not, will be ignored by DB)
        // We'll attempt both columns to ensure dates are saved
        updateData.start_date = finalDate
        
        // Link project to contract (if contract_id field exists in projects table)
        // This ensures the project is properly associated with the new contract
        // Note: We'll try to set it, but if the field doesn't exist, the DB will ignore it
        updateData.contract_id = newContract.id
        
        const { error: updateError } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', mainProjectId)
        
        if (updateError) {
          console.warn('⚠️ Failed to update existing project:', updateError)
          // If update failed due to column name, try with only work_start_date
          const { error: retryError } = await supabase
            .from('projects')
            .update({
              work_start_date: finalDate,
              status: 'active'
            })
            .eq('id', mainProjectId)
          
          if (retryError) {
            console.error('❌ Failed to update project (retry also failed):', retryError)
          } else {
            console.log('✅ Updated existing project (work_start_date only) - date:', finalDate)
          }
        } else {
          console.log('✅ Updated existing project - work_start_date:', finalDate, 'start_date:', finalDate)
        }
      } else {
        // SCENARIO B: No project exists. CREATE ONE.
        console.log('✨ Creating NEW project manually')
        
        const newProject = {
          tenant_id: tenantId,
          branch_id: branchId, // MANDATORY: Use branchStore
          name: quotation.project_name || quotation.projectName || `Project for ${contractNumber}`,
          client_id: clientId || quotation.customer_id || null,
          budget: quotation.total_amount || quotation.totalAmount || 0,
          quotation_id: quotationId, // Link to quotation (relationship maintained through quotation_id)
          work_start_date: finalDate, // FIX DATE: Use user-selected date
          status: 'active',
          completion_percentage: 0,
          work_scopes: quotation.work_scopes || quotation.workScopes || null,
          notes: `Created from quotation ${quotation.quote_number || quotation.quoteNumber}`
        }
        
        // Try to set start_date as well (if column exists)
        newProject.start_date = finalDate
        
        // Link project to contract immediately (if contract_id field exists)
        // This ensures the project is properly associated with the new contract
        newProject.contract_id = newContract.id
        
        const { data: createdProject, error: createError } = await supabase
          .from('projects')
          .insert([newProject])
          .select()
          .single()
        
        if (createError) {
          console.error('❌ Failed to create project:', createError)
          // If insert failed due to column name, try without start_date
          delete newProject.start_date
          const { data: retryProject, error: retryError } = await supabase
            .from('projects')
            .insert([newProject])
            .select()
            .single()
          
          if (retryError) {
            console.error('❌ Failed to create project (retry also failed):', retryError)
            // Continue anyway - contract was created successfully
          } else {
            console.log('✅ Created new project (work_start_date only):', retryProject.id, '- date:', finalDate)
          }
        } else {
          console.log('✅ Created new project:', createdProject.id, '- work_start_date:', finalDate, 'start_date:', finalDate)
        }
      }

      // 5. Return success
      return {
        success: true,
        contract: await this.getContract(newContract.id)
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

      // TASK 2: Force sync to Projects table - Update associated project dates
      if (dbPayload.start_date !== undefined || dbPayload.end_date !== undefined) {
        console.log('🔄 Syncing dates to associated projects...')
        
        try {
          // Get the updated contract to find its quotation_id
          const updatedContract = data || await this.getContract(id)
          const contractQuotationId = updatedContract?.quotation_id
          
          // Find projects linked to this contract by contract_id OR by quotation_id
          let projectsToUpdate = []
          
          // Method 1: Find by contract_id (if projects table has this field)
          // Note: Some schemas may not have contract_id, so we'll try both methods
          const { data: projectsByContractId } = await supabase
            .from('projects')
            .select('id')
            .eq('contract_id', id)
            .eq('tenant_id', tenantId)
            .eq('branch_id', branchId)
          
          if (projectsByContractId && projectsByContractId.length > 0) {
            projectsToUpdate = projectsByContractId
          } else if (contractQuotationId) {
            // Method 2: Find by quotation_id (if no direct contract_id link exists)
            const { data: projectsByQuotationId } = await supabase
              .from('projects')
              .select('id')
              .eq('quotation_id', contractQuotationId)
              .eq('tenant_id', tenantId)
              .eq('branch_id', branchId)
            
            if (projectsByQuotationId && projectsByQuotationId.length > 0) {
              projectsToUpdate = projectsByQuotationId
            }
          }
          
          // Update all found projects with contract dates
          if (projectsToUpdate.length > 0) {
            console.log(`✅ Found ${projectsToUpdate.length} project(s) to sync dates`)
            
            for (const project of projectsToUpdate) {
              const projectUpdateData = {}
              
              // Update start_date (if contract has it)
              if (dbPayload.start_date !== undefined) {
                projectUpdateData.start_date = dbPayload.start_date
                projectUpdateData.work_start_date = dbPayload.start_date // Update both columns
              }
              
              // Update end_date (if contract has it)
              if (dbPayload.end_date !== undefined) {
                projectUpdateData.end_date = dbPayload.end_date
              }
              
              // Only update if we have data to update
              if (Object.keys(projectUpdateData).length > 0) {
                const { error: projectUpdateError } = await supabase
                  .from('projects')
                  .update(projectUpdateData)
                  .eq('id', project.id)
                  .eq('tenant_id', tenantId)
                  .eq('branch_id', branchId)
                
                if (projectUpdateError) {
                  console.warn(`⚠️ Failed to update project ${project.id}:`, projectUpdateError)
                  // Continue anyway - contract was updated successfully
                } else {
                  console.log(`✅ Updated project ${project.id} - start_date: ${projectUpdateData.start_date || 'unchanged'}, end_date: ${projectUpdateData.end_date || 'unchanged'}`)
                }
              }
            }
          } else {
            console.log('ℹ️ No projects found to sync dates')
          }
        } catch (syncError) {
          console.warn('⚠️ Error syncing dates to projects:', syncError)
          // Continue anyway - contract was updated successfully
        }
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

      // Log deletion using centralized logsService
      const logResult = await logsService.logDeletion({
        tableName: 'contracts',
        recordId: id,
        deletionReason: deletionReason.trim(),
        recordRef: contract.contractNumber || id, // Human-readable reference
        deletedData: contract // Store snapshot of deleted record
      })

      if (!logResult.success) {
        console.error('Error logging deletion:', logResult.error)
        return {
          success: false,
          error: 'Deletion aborted: Failed to create audit log. Please contact support.',
          errorCode: 'AUDIT_LOG_FAILED'
        }
      }

      // 🏁 EXECUTION - Only after Layers 1, 2, and 3 pass successfully
      
      // ⚠️ CRITICAL: DO NOT REMOVE - Complete Cascade Deletion Chain
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

      // ⚠️ CRITICAL: DO NOT REMOVE - Quotation Rollback Logic
      // Step 6C: Rollback linked quotation to 'draft' status (BEFORE deleting contract)
      if (contract.quotationId) {
        try {
          const { error: quotationError } = await supabase
            .from('quotations')
            .update({ status: 'draft' })
            .eq('id', contract.quotationId)
            .eq('tenant_id', tenantId)
          
          if (quotationError) {
            console.error('⚠️ Failed to rollback quotation status:', quotationError)
            // Non-blocking - continue with deletion
          } else {
            console.log(`✅ Quotation ${contract.quotationId} rolled back to 'draft' status`)
          }
        } catch (quotationRollbackError) {
          console.error('⚠️ Error during quotation rollback:', quotationRollbackError)
          // Continue with deletion even if rollback fails
        }
      }

      // ⚠️ CRITICAL: DO NOT REMOVE - Project Deletion Chain
      // Step 6D: Delete linked project if exists (BEFORE deleting contract to avoid FK issues)
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
                  project_snapshot: linkedProjectSnapshot,
                  quotation_rolled_back: !!contract.quotationId
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

      return { 
        success: true, 
        linkedProjectDeleted: linkedProjectId !== null, 
        linkedProjectId: linkedProjectId,
        quotationRolledBack: !!contract.quotationId
      }
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
