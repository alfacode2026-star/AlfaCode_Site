import { supabase } from './supabaseClient'
import customersService from './customersService'
import quotationsService from './quotationsService'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

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
  async convertQuotationToContract(quotationId, contractType = 'original') {
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
      
      const newContract = {
        tenant_id: tenantId,
        contract_number: contractNumber,
        quotation_id: quotationId,
        customer_id: quotation.customerId || null,
        customer_name: quotation.customerName,
        customer_phone: quotation.customerPhone,
        contract_type: contractType,
        work_type: quotation.workType,
        total_amount: quotation.totalAmount,
        project_name: quotation.projectName || null,
        status: 'in_progress',
        notes: `تم إنشاء هذا العقد من العرض ${quotation.quoteNumber}`,
        created_by: 'user'
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

  // Get all contracts (filtered by current tenant)
  async getContracts() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch contracts.')
        return []
      }

      const { data: contracts, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

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

      const { data: contract, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

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
        created_by: contractData.createdBy || 'user'
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

      const updateData = {}
      if (contractData.customerName !== undefined) updateData.customer_name = contractData.customerName
      if (contractData.customerPhone !== undefined) updateData.customer_phone = contractData.customerPhone
      // Only update customer_email if it's provided and not empty
      if (contractData.customerEmail !== undefined) {
        if (contractData.customerEmail && contractData.customerEmail.trim() !== '') {
          updateData.customer_email = contractData.customerEmail
        } else {
          updateData.customer_email = null
        }
      }
      if (contractData.contractType !== undefined) updateData.contract_type = contractData.contractType
      if (contractData.workType !== undefined) updateData.work_type = contractData.workType
      if (contractData.totalAmount !== undefined) updateData.total_amount = contractData.totalAmount
      if (contractData.status !== undefined) updateData.status = contractData.status
      if (contractData.startDate !== undefined) updateData.start_date = contractData.startDate
      if (contractData.endDate !== undefined) updateData.end_date = contractData.endDate
      if (contractData.projectId !== undefined) updateData.project_id = contractData.projectId
      if (contractData.projectName !== undefined) updateData.project_name = contractData.projectName || null
      if (contractData.notes !== undefined) updateData.notes = contractData.notes

      const { data, error } = await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

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

  // Delete contract
  async deleteContract(id) {
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

      // Delete contract items first (cascade should handle this, but being explicit)
      await supabase
        .from('contract_items')
        .delete()
        .eq('contract_id', id)

      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
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

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('quotation_id', quotationId)

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

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', status)
        .order('created_at', { ascending: false })

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

      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

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
