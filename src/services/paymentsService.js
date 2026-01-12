import { supabase } from './supabaseClient'
import contractsService from './contractsService'
import ordersService from './ordersService'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class PaymentsService {
  // Get current user ID from Supabase auth
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

  // Generate payment number
  generatePaymentNumber(contractNumber) {
    const prefix = 'P'
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return contractNumber ? `${contractNumber}-${prefix}-${random}` : `${prefix}-${random}`
  }

  // Generate auto-reference number for administrative expenses (EXP-001, EXP-002, etc.)
  async generateExpenseReferenceNumber() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        // Fallback if no tenant ID
        return `EXP-${Date.now().toString().slice(-6)}`
      }

      // Get the highest existing reference number for administrative expenses only
      // Administrative expenses have expense_category not null and transaction_type = 'regular'
      const { data: existingExpenses, error } = await supabase
        .from('payments')
        .select('reference_number')
        .eq('tenant_id', tenantId)
        .eq('transaction_type', 'regular') // Only regular expenses, not advances or settlements
        .not('expense_category', 'is', null) // Only administrative expenses have categories
        .not('reference_number', 'is', null)
        .like('reference_number', 'EXP-%')
        .order('reference_number', { ascending: false })
        .limit(10)

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching existing reference numbers:', error)
        // Fallback to timestamp-based
        return `EXP-${Date.now().toString().slice(-6)}`
      }

      // Find the highest number
      let maxNumber = 0
      if (existingExpenses && existingExpenses.length > 0) {
        existingExpenses.forEach(expense => {
          const match = expense.reference_number?.match(/EXP-(\d+)/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num > maxNumber) {
              maxNumber = num
            }
          }
        })
      }

      // Generate next number
      const nextNumber = (maxNumber + 1).toString().padStart(3, '0')
      return `EXP-${nextNumber}`
    } catch (error) {
      console.error('Error generating expense reference number:', error)
      // Fallback to timestamp-based
      return `EXP-${Date.now().toString().slice(-6)}`
    }
  }

  // Generate auto-reference number for manager advances (ADV-001, ADV-002, etc.)
  async generateAdvanceReferenceNumber() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        // Fallback if no tenant ID
        return `ADV-${Date.now().toString().slice(-6)}`
      }

      // Get the highest existing reference number for manager advances
      // Manager advances have transaction_type = 'advance'
      const { data: existingAdvances, error } = await supabase
        .from('payments')
        .select('reference_number')
        .eq('tenant_id', tenantId)
        .eq('transaction_type', 'advance')
        .not('reference_number', 'is', null)
        .like('reference_number', 'ADV-%')
        .order('reference_number', { ascending: false })
        .limit(10)

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching existing advance reference numbers:', error)
        // Fallback to timestamp-based
        return `ADV-${Date.now().toString().slice(-6)}`
      }

      // Find the highest number
      let maxNumber = 0
      if (existingAdvances && existingAdvances.length > 0) {
        existingAdvances.forEach(advance => {
          const match = advance.reference_number?.match(/ADV-(\d+)/)
          if (match) {
            const num = parseInt(match[1], 10)
            if (num > maxNumber) {
              maxNumber = num
            }
          }
        })
      }

      // Generate next number
      const nextNumber = (maxNumber + 1).toString().padStart(3, '0')
      return `ADV-${nextNumber}`
    } catch (error) {
      console.error('Error generating advance reference number:', error)
      // Fallback to timestamp-based
      return `ADV-${Date.now().toString().slice(-6)}`
    }
  }

  // Get all payments (filtered by current tenant)
  async getPayments() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch payments.')
        return []
      }

      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (payments || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching payments:', error.message)
      return []
    }
  }

  // Get payment by ID
  async getPayment(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch payment.')
        return null
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      return this.mapToCamelCase(payment)
    } catch (error) {
      console.error('Error fetching payment:', error.message)
      return null
    }
  }

  // Get payments by contract
  async getPaymentsByContract(contractId) {
    try {
      if (!contractId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('contract_id', contractId)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (payments || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching payments by contract:', error.message)
      return []
    }
  }

  // Create new payment
  async createPayment(paymentData) {
    try {
      // For general expenses or project expenses, contractId can be NULL
      // Only require contractId if it's a contract-related payment (income from client)
      const isProjectExpense = !paymentData.isGeneralExpense && paymentData.projectId
      if (!paymentData.isGeneralExpense && !isProjectExpense && !paymentData.contractId) {
        return {
          success: false,
          error: 'معرف العقد مطلوب (أو حدد مصروف عام أو مصروف مشروع)',
          errorCode: 'CONTRACT_ID_REQUIRED'
        }
      }

      // Verify contract exists only if it's a contract-related payment
      if (paymentData.contractId && !paymentData.isGeneralExpense && !isProjectExpense) {
        const contract = await contractsService.getContract(paymentData.contractId)
        if (!contract) {
          return {
            success: false,
            error: 'العقد غير موجود',
            errorCode: 'CONTRACT_NOT_FOUND'
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

      // Generate payment number
      let paymentNumber = paymentData.paymentNumber
      if (!paymentNumber) {
        if (paymentData.isGeneralExpense) {
          // For general expenses, generate a standalone payment number
          paymentNumber = `GE-${Date.now()}`
        } else if (paymentData.projectId && !paymentData.contractId) {
          // For project expenses without contract, generate project expense number
          paymentNumber = `PE-${Date.now()}`
        } else if (paymentData.contractId) {
          const contract = await contractsService.getContract(paymentData.contractId)
          paymentNumber = contract ? this.generatePaymentNumber(contract.contractNumber) : `P-${Date.now()}`
        } else {
          paymentNumber = `P-${Date.now()}`
        }
      }

      // Determine payment_frequency: required for administrative expenses, null for project expenses and manager advances
      let paymentFrequency = null
      if (paymentData.paymentFrequency !== null && paymentData.paymentFrequency !== undefined && paymentData.paymentFrequency !== '') {
        paymentFrequency = paymentData.paymentFrequency
      } else if (paymentData.isGeneralExpense && paymentData.transactionType !== 'advance' && paymentData.transactionType !== 'settlement') {
        // Default to 'one-time' for administrative expenses if not specified
        paymentFrequency = 'one-time'
      }
      // Otherwise keep as null (for project expenses or manager advances)

      // Calculate is_general_expense: true if no project_id (administrative expenses or manager advances)
      const isGeneralExpense = paymentData.isGeneralExpense !== undefined 
        ? paymentData.isGeneralExpense 
        : (!paymentData.projectId && (paymentData.category || paymentData.transactionType === 'advance' || paymentData.transactionType === 'settlement'))

      // For new advances, initialize remaining_amount = amount (skip validation, set equal to amount)
      // For settlements and administrative expenses, remaining_amount is null
      let remainingAmount = null
      if (paymentData.transactionType === 'advance') {
        // For new advances: remaining_amount is set equal to the amount entered by the user
        // This allows tracking how much of the advance remains to be settled
        remainingAmount = paymentData.amount || 0
      }

      const newPayment = {
        tenant_id: tenantId,
        contract_id: isGeneralExpense ? null : (paymentData.contractId || null),
        // For manager advances, project_id can be optional (not null)
        project_id: paymentData.transactionType === 'advance' || paymentData.transactionType === 'settlement' 
          ? (paymentData.projectId || null) 
          : (isGeneralExpense ? null : (paymentData.projectId || null)),
        work_scope: isGeneralExpense ? null : (paymentData.workScope || null),
        // expense_category is required for administrative expenses, optional for others (null for project expenses/manager advances)
        expense_category: paymentData.category || null,
        payment_number: paymentNumber,
        amount: paymentData.amount || 0,
        remaining_amount: remainingAmount,
        due_date: paymentData.dueDate,
        paid_date: paymentData.paidDate || null,
        // For manager advances, status defaults to 'pending', for others use provided or 'pending'
        status: paymentData.status || (paymentData.transactionType === 'advance' || paymentData.transactionType === 'settlement' ? 'pending' : 'pending'),
        payment_method: paymentData.paymentMethod || null,
        reference_number: paymentData.referenceNumber || null,
        notes: paymentData.notes || null,
        recipient_name: paymentData.recipientName || null,
        // payment_frequency: null for project expenses/manager advances, required value for administrative expenses
        payment_frequency: paymentFrequency,
        transaction_type: paymentData.transactionType || 'regular',
        manager_name: paymentData.managerName || null,
        linked_advance_id: paymentData.linkedAdvanceId || null,
        // settlement_type: only for settlements, 'expense' or 'return'
        settlement_type: paymentData.settlementType || null,
        is_general_expense: isGeneralExpense
      }

      // Only add created_by if we have a valid UUID (optional)
      let createdBy = paymentData.createdBy
      if (!createdBy || createdBy === 'user') {
        createdBy = await this.getCurrentUserId()
      }
      if (createdBy && createdBy !== 'user') {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(createdBy)) {
          newPayment.created_by = createdBy
        }
        // If invalid UUID format, omit the field - database should handle this gracefully
      }
      // If createdBy is null or 'user', omit the field - database should handle this gracefully

      const { data: insertedPayment, error } = await supabase
        .from('payments')
        .insert([newPayment])
        .select()
        .single()

      if (error) throw error

      // If this is a settlement (expense or return), update the linked advance's remaining_amount
      if (paymentData.transactionType === 'settlement' && paymentData.linkedAdvanceId) {
        const linkedAdvance = await this.getPayment(paymentData.linkedAdvanceId)
        if (linkedAdvance) {
          const settlementAmount = parseFloat(paymentData.amount) || 0
          const currentRemaining = parseFloat(linkedAdvance.remainingAmount) || parseFloat(linkedAdvance.amount) || 0
          const newRemainingAmount = Math.max(0, currentRemaining - settlementAmount)
          const newStatus = newRemainingAmount <= 0 ? 'settled' : 'partially_settled'

          await supabase
            .from('payments')
            .update({ 
              remaining_amount: newRemainingAmount,
              status: newStatus
            })
            .eq('id', paymentData.linkedAdvanceId)
            .eq('tenant_id', tenantId)
        }
      }

      return {
        success: true,
        payment: this.mapToCamelCase(insertedPayment)
      }
    } catch (error) {
      console.error('Error creating payment:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء الدفعة',
        errorCode: 'CREATE_PAYMENT_FAILED'
      }
    }
  }

  // Update payment
  async updatePayment(id, paymentData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الدفعة مطلوب',
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
      if (paymentData.amount !== undefined) {
        updateData.amount = paymentData.amount
        // If updating amount for an advance, also update remaining_amount if it exists
        if (paymentData.transactionType === 'advance') {
          // Get current payment to check if it's an advance
          const currentPayment = await this.getPayment(id)
          if (currentPayment && currentPayment.transactionType === 'advance' && currentPayment.remainingAmount !== null) {
            // Adjust remaining_amount proportionally or recalculate
            const currentAmount = parseFloat(currentPayment.amount) || 0
            const currentRemaining = parseFloat(currentPayment.remainingAmount) || 0
            const newAmount = parseFloat(paymentData.amount) || 0
            // Recalculate remaining_amount proportionally
            if (currentAmount > 0) {
              const ratio = currentRemaining / currentAmount
              updateData.remaining_amount = newAmount * ratio
            } else {
              updateData.remaining_amount = newAmount
            }
          }
        }
      }
      if (paymentData.remainingAmount !== undefined) updateData.remaining_amount = paymentData.remainingAmount !== null ? paymentData.remainingAmount : null
      if (paymentData.dueDate !== undefined) updateData.due_date = paymentData.dueDate
      if (paymentData.paidDate !== undefined) updateData.paid_date = paymentData.paidDate
      if (paymentData.status !== undefined) updateData.status = paymentData.status
      if (paymentData.paymentMethod !== undefined) updateData.payment_method = paymentData.paymentMethod
      if (paymentData.referenceNumber !== undefined) updateData.reference_number = paymentData.referenceNumber
      if (paymentData.notes !== undefined) updateData.notes = paymentData.notes
      if (paymentData.recipientName !== undefined) updateData.recipient_name = paymentData.recipientName || null
      
      // Handle project_id and isGeneralExpense
      if (paymentData.isGeneralExpense !== undefined) {
        if (paymentData.isGeneralExpense) {
          // For general expenses, set project_id to null
          updateData.project_id = null
        } else if (paymentData.projectId !== undefined) {
          updateData.project_id = paymentData.projectId || null
        }
      } else if (paymentData.projectId !== undefined) {
        updateData.project_id = paymentData.projectId || null
      }
      
      if (paymentData.workScope !== undefined) updateData.work_scope = paymentData.workScope || null
      if (paymentData.category !== undefined) updateData.expense_category = paymentData.category || null
      
      // Handle payment_frequency: allow null for project expenses and manager advances
      if (paymentData.paymentFrequency !== undefined) {
        if (paymentData.paymentFrequency === null) {
          updateData.payment_frequency = null
        } else if (paymentData.paymentFrequency === '') {
          // Empty string means null for non-administrative expenses
          updateData.payment_frequency = null
        } else {
          updateData.payment_frequency = paymentData.paymentFrequency
        }
      }
      
      if (paymentData.transactionType !== undefined) updateData.transaction_type = paymentData.transactionType || 'regular'
      if (paymentData.managerName !== undefined) updateData.manager_name = paymentData.managerName || null
      if (paymentData.linkedAdvanceId !== undefined) updateData.linked_advance_id = paymentData.linkedAdvanceId || null
      if (paymentData.settlementType !== undefined) updateData.settlement_type = paymentData.settlementType || null
      
      // Update is_general_expense if needed
      if (paymentData.isGeneralExpense !== undefined) {
        updateData.is_general_expense = paymentData.isGeneralExpense
      } else if (updateData.project_id !== undefined) {
        // Recalculate if project_id is being updated
        const newProjectId = updateData.project_id
        updateData.is_general_expense = !newProjectId && (updateData.expense_category !== undefined ? updateData.expense_category : paymentData.category)
      }

      // If marking as paid, set paid_date if not provided
      if (paymentData.status === 'paid' && !paymentData.paidDate) {
        updateData.paid_date = new Date().toISOString().split('T')[0]
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        payment: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating payment:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث الدفعة',
        errorCode: 'UPDATE_PAYMENT_FAILED'
      }
    }
  }

  // Delete payment
  async deletePayment(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الدفعة مطلوب',
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
        .from('payments')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting payment:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف الدفعة',
        errorCode: 'DELETE_PAYMENT_FAILED'
      }
    }
  }

  // Mark payment as paid
  async markAsPaid(id, paymentMethod = null, referenceNumber = null) {
    return this.updatePayment(id, {
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod,
      referenceNumber: referenceNumber
    })
  }

  // Update payment status only
  async updatePaymentStatus(id, newStatus) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الدفعة مطلوب',
          errorCode: 'INVALID_ID'
        }
      }

      if (!newStatus) {
        return {
          success: false,
          error: 'الحالة الجديدة مطلوبة',
          errorCode: 'INVALID_STATUS'
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

      const { data, error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        payment: this.mapToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating payment status:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث حالة الدفعة',
        errorCode: 'UPDATE_STATUS_FAILED'
      }
    }
  }

  // Get payments by status
  async getPaymentsByStatus(status) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', status)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (data || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching payments by status:', error.message)
      return []
    }
  }

  // Get payments by project ID (with tenant filter)
  async getPaymentsByProject(projectId) {
    try {
      if (!projectId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (data || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching payments by project:', error.message)
      return []
    }
  }

  // Get income payments (client payments) by project
  async getIncomePaymentsByProject(projectId) {
    try {
      if (!projectId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .eq('transaction_type', 'regular')
        .is('contract_id', null)
        .order('due_date', { ascending: true })

      if (error) throw error

      return (data || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching income payments by project:', error.message)
      return []
    }
  }

  // Get expense payments (supplier payments) by project
  async getExpensePaymentsByProject(projectId) {
    try {
      if (!projectId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .eq('transaction_type', 'regular')
        .order('due_date', { ascending: true })

      if (error) throw error

      return (data || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching expense payments by project:', error.message)
      return []
    }
  }

  // Get all general expenses (expenses without project_id and with category)
  async getGeneralExpenses() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('project_id', null)
        .not('expense_category', 'is', null)
        .eq('transaction_type', 'regular')
        .order('due_date', { ascending: false })

      if (error) throw error

      return (data || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching general expenses:', error.message)
      return []
    }
  }

  // Get all expenses (both general and project-related) for the General Expenses page
  // This includes: administrative expenses (with category), manager advances (transaction_type = 'advance' or 'settlement')
  // Note: Project-related expenses saved from General Expenses page are handled via ordersService and shown in Orders page, not here
  async getAllExpenses() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      // Get all expense payments and filter to include:
      // 1. Administrative expenses: have expense_category (not null)
      // 2. Manager advances: transaction_type = 'advance' or 'settlement'
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .or('transaction_type.eq.regular,transaction_type.eq.advance,transaction_type.eq.settlement')
        .order('due_date', { ascending: false })

      if (error) throw error

      // Filter in JavaScript: include expenses with category OR manager advances
      const filtered = (data || []).filter(p => 
        p.expense_category !== null || 
        p.transaction_type === 'advance' || 
        p.transaction_type === 'settlement'
      )
      
      return filtered.map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching all expenses:', error.message)
      return []
    }
  }

  // Get total general expenses (sum of all general expenses)
  async getTotalGeneralExpenses() {
    try {
      const generalExpenses = await this.getGeneralExpenses()
      return generalExpenses
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    } catch (error) {
      console.error('Error calculating total general expenses:', error.message)
      return 0
    }
  }

  // Get advances (petty cash issued to managers)
  // Can filter by managerName and/or status (defaults to all statuses)
  // If status is null, returns all advances (useful for filtering in UI)
  async getAdvances(managerName = null, status = null) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      let query = supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('transaction_type', 'advance')
        .order('due_date', { ascending: false })

      if (managerName) {
        query = query.eq('manager_name', managerName)
      }

      if (status) {
        query = query.eq('status', status)
      }

      const { data: advances, error } = await query

      if (error) throw error

      return (advances || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching advances:', error.message)
      return []
    }
  }

  // Get settlements for an advance
  async getSettlementsForAdvance(advanceId) {
    try {
      if (!advanceId) return []

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      const { data: settlements, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('linked_advance_id', advanceId)
        .eq('transaction_type', 'settlement')
        .order('due_date', { ascending: false })

      if (error) throw error

      return (settlements || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching settlements:', error.message)
      return []
    }
  }

  // Get outstanding advances per manager
  async getOutstandingAdvancesByManager() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      // Get all advances
      const advances = await this.getAdvances()

      // Get all settlements
      const { data: settlements, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('transaction_type', 'settlement')
        .not('linked_advance_id', 'is', null)

      if (error) throw error

      // Calculate outstanding balance per manager
      const managerBalances = {}

      advances.forEach(advance => {
        // CRITICAL: Skip settled advances (remaining_amount = 0) to prevent double-counting
        // When an advance is transferred, the old advance is marked as settled (remaining_amount = 0, status = 'settled')
        // Only count advances with remaining_amount > 0 to avoid adding the amount again
        const remainingAmount = advance.remaining_amount !== null && advance.remaining_amount !== undefined
          ? parseFloat(advance.remaining_amount)
          : null
        
        // Skip if remaining_amount is explicitly 0 (settled/closed advance)
        if (remainingAmount === 0) {
          return // Don't add settled advances to manager balance
        }

        const manager = advance.managerName || 'غير محدد'
        if (!managerBalances[manager]) {
          managerBalances[manager] = {
            managerName: manager,
            totalAdvances: 0,
            totalSettled: 0,
            outstandingBalance: 0,
            advanceCount: 0
          }
        }

        const advanceAmount = parseFloat(advance.amount) || 0
        managerBalances[manager].totalAdvances += advanceAmount
        managerBalances[manager].advanceCount += 1

        // Use remaining_amount if available, otherwise calculate from settlements
        if (remainingAmount !== null) {
          // Use remaining_amount directly for outstanding balance
          const settledAmount = advanceAmount - remainingAmount
          managerBalances[manager].totalSettled += settledAmount
          managerBalances[manager].outstandingBalance += remainingAmount
        } else {
          // Fallback: Calculate settled amount from settlements
          const settledAmount = (settlements || [])
            .filter(s => s.linked_advance_id === advance.id)
            .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
          managerBalances[manager].totalSettled += settledAmount
          managerBalances[manager].outstandingBalance += (advanceAmount - settledAmount)
        }
      })

      return Object.values(managerBalances)
    } catch (error) {
      console.error('Error calculating outstanding advances:', error.message)
      return []
    }
  }

  // Transfer advance to a new project
  // This method: 1) Closes current advance (remaining_amount = 0, status = 'settled')
  //              2) Creates NEW advance for same manager in NEW project with same remaining_amount
  //              3) Links them using source_advance_id and sets transfer_date
  async transferAdvance(advanceId, newProjectId, transferDate = null) {
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

      // Get the current advance
      const currentAdvance = await this.getPayment(advanceId)
      if (!currentAdvance) {
        return {
          success: false,
          error: 'العهدة غير موجودة',
          errorCode: 'ADVANCE_NOT_FOUND'
        }
      }

      if (currentAdvance.transactionType !== 'advance') {
        return {
          success: false,
          error: 'السجل المحدد ليس عهدة',
          errorCode: 'NOT_AN_ADVANCE'
        }
      }

      // Get remaining amount
      const remainingAmount = currentAdvance.remainingAmount !== null && currentAdvance.remainingAmount !== undefined
        ? parseFloat(currentAdvance.remainingAmount)
        : parseFloat(currentAdvance.amount || 0)

      if (remainingAmount <= 0) {
        return {
          success: false,
          error: 'العهدة تم تسويتها بالكامل - لا يمكن نقل عهدة مسددة',
          errorCode: 'ADVANCE_FULLY_SETTLED'
        }
      }

      // Use provided transfer date or current date
      const transferDateValue = transferDate || new Date().toISOString().split('T')[0]

      // Step 1: Close current advance (remaining_amount = 0, status = 'settled')
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          remaining_amount: 0,
          status: 'settled'
        })
        .eq('id', advanceId)
        .eq('tenant_id', tenantId)

      if (updateError) {
        console.error('Error updating current advance:', updateError)
        return {
          success: false,
          error: updateError.message || 'فشل في تحديث العهدة الحالية',
          errorCode: 'UPDATE_ADVANCE_FAILED'
        }
      }

      // Step 2: Create NEW advance for same manager in NEW project
      // Generate payment number for new advance
      const newAdvancePaymentNumber = `ADV-TRANS-${Date.now()}`

      // Get original advance date or use transfer date
      const advanceDate = currentAdvance.dueDate || transferDateValue

      const newAdvance = {
        tenant_id: tenantId,
        contract_id: null,
        project_id: newProjectId || null,
        work_scope: null,
        expense_category: null,
        payment_number: newAdvancePaymentNumber,
        amount: remainingAmount,
        remaining_amount: remainingAmount, // Initialize with same remaining amount
        due_date: advanceDate,
        paid_date: null,
        status: currentAdvance.status || 'pending', // Keep same status
        payment_method: currentAdvance.paymentMethod || null,
        reference_number: currentAdvance.referenceNumber || null,
        notes: currentAdvance.notes ? `${currentAdvance.notes} (منقول من عهدة ${currentAdvance.referenceNumber || currentAdvance.paymentNumber})` : `منقول من عهدة ${currentAdvance.referenceNumber || currentAdvance.paymentNumber}`,
        recipient_name: null,
        payment_frequency: null,
        transaction_type: 'advance',
        manager_name: currentAdvance.managerName || null,
        linked_advance_id: null, // No linked advance for transferred advances
        settlement_type: null,
        is_general_expense: true, // Manager advances are general expenses
        source_advance_id: advanceId // Link to original advance
      }

      // Only add created_by if we have a valid UUID (optional)
      const createdBy = await this.getCurrentUserId()
      if (createdBy) {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(createdBy)) {
          newAdvance.created_by = createdBy
        }
        // If invalid UUID format, omit the field - database should handle this gracefully
      }
      // If createdBy is null, omit the field - database should handle this gracefully

      const { data: insertedAdvance, error: insertError } = await supabase
        .from('payments')
        .insert([newAdvance])
        .select()
        .single()

      if (insertError) {
        // Rollback: restore original advance
        await supabase
          .from('payments')
          .update({
            remaining_amount: remainingAmount,
            status: currentAdvance.status || 'pending'
          })
          .eq('id', advanceId)
          .eq('tenant_id', tenantId)

        console.error('Error creating new advance:', insertError)
        return {
          success: false,
          error: insertError.message || 'فشل في إنشاء العهدة الجديدة',
          errorCode: 'CREATE_ADVANCE_FAILED'
        }
      }

      // Step 3: Update source_advance_id and transfer_date in original advance (if columns exist)
      // Note: These columns may not exist yet in the database, so we'll handle gracefully
      try {
        await supabase
          .from('payments')
          .update({
            source_advance_id: advanceId, // Mark original as source
            transfer_date: transferDateValue
          })
          .eq('id', advanceId)
          .eq('tenant_id', tenantId)
      } catch (transferFieldError) {
        // If columns don't exist, log warning but don't fail
        console.warn('Transfer fields (source_advance_id, transfer_date) may not exist in database:', transferFieldError)
      }

      return {
        success: true,
        originalAdvance: this.mapToCamelCase(await this.getPayment(advanceId)),
        newAdvance: this.mapToCamelCase(insertedAdvance)
      }
    } catch (error) {
      console.error('Error transferring advance:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في نقل العهدة',
        errorCode: 'TRANSFER_ADVANCE_FAILED'
      }
    }
  }

  // Create settlement with Purchase Order
  // This method: 1) Creates settlement payment, 2) Creates purchase order, 3) Updates advance status to 'settled'
  async createSettlementWithPO(settlementData) {
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

      // Validate required fields
      if (!settlementData.linkedAdvanceId) {
        return {
          success: false,
          error: 'معرف العهدة المرتبطة مطلوب',
          errorCode: 'LINKED_ADVANCE_ID_REQUIRED'
        }
      }

      if (!settlementData.projectId) {
        return {
          success: false,
          error: 'معرف المشروع مطلوب لأمر الشراء',
          errorCode: 'PROJECT_ID_REQUIRED'
        }
      }

      if (!settlementData.vendorId) {
        return {
          success: false,
          error: 'معرف المورد/المستلم مطلوب',
          errorCode: 'VENDOR_ID_REQUIRED'
        }
      }

      if (!settlementData.poItems || settlementData.poItems.length === 0) {
        return {
          success: false,
          error: 'يجب إضافة بند واحد على الأقل لأمر الشراء',
          errorCode: 'PO_ITEMS_REQUIRED'
        }
      }

      // Get the linked advance to validate and update
      const linkedAdvance = await this.getPayment(settlementData.linkedAdvanceId)
      if (!linkedAdvance) {
        return {
          success: false,
          error: 'العهدة المرتبطة غير موجودة',
          errorCode: 'ADVANCE_NOT_FOUND'
        }
      }

      if (linkedAdvance.status !== 'approved' && linkedAdvance.status !== 'partially_settled') {
        return {
          success: false,
          error: 'لا يمكن تسوية عهدة غير معتمدة أو تم تسويتها بالكامل',
          errorCode: 'ADVANCE_NOT_APPROVED'
        }
      }

      // Validate settlement amount <= remaining amount (not original amount)
      const settlementAmount = parseFloat(settlementData.amount) || 0
      const remainingAmount = parseFloat(linkedAdvance.remainingAmount) || parseFloat(linkedAdvance.amount) || 0
      
      if (remainingAmount <= 0) {
        return {
          success: false,
          error: 'العهدة تم تسويتها بالكامل - لا يمكن إنشاء تسوية جديدة',
          errorCode: 'ADVANCE_FULLY_SETTLED'
        }
      }

      if (settlementAmount > remainingAmount) {
        return {
          success: false,
          error: `مبلغ التسوية (${settlementAmount.toLocaleString()}) يجب أن يكون أقل من أو يساوي المبلغ المتبقي (${remainingAmount.toLocaleString()})`,
          errorCode: 'SETTLEMENT_AMOUNT_EXCEEDS_REMAINING'
        }
      }

      // Step 1: Create settlement payment record
      const settlementDate = settlementData.date || new Date().toISOString().split('T')[0]
      
      // Generate payment number for settlement
      const settlementPaymentNumber = `SETT-${Date.now()}`

      const settlementPayment = {
        tenant_id: tenantId,
        contract_id: null,
        project_id: settlementData.projectId || null,
        work_scope: settlementData.workScope || null,
        expense_category: null,
        payment_number: settlementPaymentNumber,
        amount: settlementAmount,
        remaining_amount: null, // Settlements don't have remaining amount
        due_date: settlementDate,
        paid_date: settlementDate,
        status: 'approved', // Settlements are auto-approved
        payment_method: 'settlement', // Force payment method to 'settlement' for all settlements
        reference_number: settlementData.referenceNumber || null,
        notes: settlementData.notes || null,
        recipient_name: null,
        payment_frequency: null,
        transaction_type: 'settlement',
        manager_name: settlementData.managerName || null,
        linked_advance_id: settlementData.linkedAdvanceId,
        settlement_type: settlementData.settlementType || 'expense',
        is_general_expense: true
      }

      // Only add created_by if we have a valid UUID (optional)
      const createdBy = await this.getCurrentUserId()
      if (createdBy) {
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(createdBy)) {
          settlementPayment.created_by = createdBy
        }
        // If invalid UUID format, omit the field - database should handle this gracefully
      }
      // If createdBy is null, omit the field - database should handle this gracefully

      const { data: insertedSettlement, error: settlementError } = await supabase
        .from('payments')
        .insert([settlementPayment])
        .select()
        .single()

      if (settlementError) {
        console.error('Error creating settlement payment:', settlementError)
        return {
          success: false,
          error: settlementError.message || 'فشل في إنشاء سجل التسوية',
          errorCode: 'CREATE_SETTLEMENT_FAILED'
        }
      }

      // Step 2: Create purchase order using ordersService
      // Calculate PO total from items (for display/validation)
      const poSubtotal = settlementData.poItems.reduce((sum, item) => {
        const itemTotal = (item.total || item.unitPrice * item.quantity) || 0
        return sum + itemTotal
      }, 0)

      const orderData = {
        customerId: settlementData.vendorId,
        customerName: settlementData.vendorName,
        customerPhone: settlementData.vendorPhone || '',
        customerEmail: settlementData.vendorEmail || '',
        projectId: settlementData.projectId,
        workScope: settlementData.workScope || null,
        items: settlementData.poItems,
        status: 'completed', // Settlement PO is immediately completed
        paymentMethod: settlementData.poPaymentMethod || 'cash',
        paymentStatus: 'paid', // Settlement PO is considered paid
        shippingAddress: '',
        shippingMethod: 'standard',
        notes: `تسوية عهدة رقم ${linkedAdvance.referenceNumber || linkedAdvance.paymentNumber} - ${settlementData.notes || ''}`,
        createdBy: 'user',
        isSettlementPO: true, // Flag to skip tax/discounts
        exactTotal: settlementAmount // Use exact settlement amount, not calculated from items
      }

      const poResult = await ordersService.createOrder(orderData)

      if (!poResult.success) {
        // Rollback: delete settlement payment if PO creation failed
        await supabase.from('payments').delete().eq('id', insertedSettlement.id)
        return {
          success: false,
          error: poResult.error || 'فشل في إنشاء أمر الشراء',
          errorCode: 'CREATE_PO_FAILED'
        }
      }

      // Step 3: Update original advance remaining_amount and status
      const newRemainingAmount = Math.max(0, remainingAmount - settlementAmount)
      const newStatus = newRemainingAmount <= 0 ? 'settled' : 'partially_settled'
      
      const { error: updateError } = await supabase
        .from('payments')
        .update({ 
          remaining_amount: newRemainingAmount,
          status: newStatus
        })
        .eq('id', settlementData.linkedAdvanceId)
        .eq('tenant_id', tenantId)

      if (updateError) {
        console.error('Error updating advance status:', updateError)
        // Note: Settlement and PO are already created, so we log the error but don't fail
        // The user can manually update the advance status if needed
        console.warn('Warning: Settlement and PO created, but advance status update failed. Advance ID:', settlementData.linkedAdvanceId)
      }

      return {
        success: true,
        settlement: this.mapToCamelCase(insertedSettlement),
        purchaseOrder: poResult.order,
        advanceUpdated: !updateError
      }
    } catch (error) {
      console.error('Error creating settlement with PO:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء التسوية وأمر الشراء',
        errorCode: 'CREATE_SETTLEMENT_WITH_PO_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(payment) {
    if (!payment) return null

    return {
      id: payment.id,
      contractId: payment.contract_id,
      projectId: payment.project_id || null,
      workScope: payment.work_scope || null,
      expenseCategory: payment.expense_category || null,
      isGeneralExpense: payment.is_general_expense !== undefined ? payment.is_general_expense : (!payment.project_id && (payment.expense_category || payment.transaction_type === 'advance' || payment.transaction_type === 'settlement')),
      paymentNumber: payment.payment_number,
      amount: parseFloat(payment.amount) || 0,
      remainingAmount: payment.remaining_amount !== null && payment.remaining_amount !== undefined ? parseFloat(payment.remaining_amount) : null,
      dueDate: payment.due_date,
      paidDate: payment.paid_date,
      status: payment.status,
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
      notes: payment.notes,
      recipientName: payment.recipient_name || null,
      paymentFrequency: payment.payment_frequency !== null && payment.payment_frequency !== undefined ? payment.payment_frequency : null,
      transactionType: payment.transaction_type || 'regular',
      paymentType: payment.payment_type || null,
      managerName: payment.manager_name || null,
      linkedAdvanceId: payment.linked_advance_id || null,
      settlementType: payment.settlement_type || null,
      sourceAdvanceId: payment.source_advance_id || null,
      transferDate: payment.transfer_date || null,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      createdBy: payment.created_by
    }
  }
}

const paymentsService = new PaymentsService()
export default paymentsService
