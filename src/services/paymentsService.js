import { supabase } from './supabaseClient'
import contractsService from './contractsService'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class PaymentsService {
  // Generate payment number
  generatePaymentNumber(contractNumber) {
    const prefix = 'P'
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return contractNumber ? `${contractNumber}-${prefix}-${random}` : `${prefix}-${random}`
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

      const newPayment = {
        tenant_id: tenantId,
        contract_id: paymentData.isGeneralExpense ? null : (paymentData.contractId || null),
        project_id: paymentData.isGeneralExpense ? null : (paymentData.projectId || null),
        work_scope: paymentData.isGeneralExpense ? null : (paymentData.workScope || null),
        payment_type: paymentData.isGeneralExpense ? 'expense' : (paymentData.paymentType || (paymentData.contractId ? 'income' : 'expense')),
        // Allow expense_category for all expenses (general expenses OR categorized project expenses like Labor)
        expense_category: paymentData.category || null,
        payment_number: paymentNumber,
        amount: paymentData.amount || 0,
        due_date: paymentData.dueDate,
        paid_date: paymentData.paidDate || null,
        status: paymentData.status || 'pending',
        payment_method: paymentData.paymentMethod || null,
        reference_number: paymentData.referenceNumber || null,
        notes: paymentData.notes || null,
        payment_frequency: paymentData.paymentFrequency || 'one-time',
        transaction_type: paymentData.transactionType || 'regular',
        manager_name: paymentData.managerName || null,
        linked_advance_id: paymentData.linkedAdvanceId || null,
        created_by: paymentData.createdBy || 'user'
      }

      const { data: insertedPayment, error } = await supabase
        .from('payments')
        .insert([newPayment])
        .select()
        .single()

      if (error) throw error

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
      if (paymentData.amount !== undefined) updateData.amount = paymentData.amount
      if (paymentData.dueDate !== undefined) updateData.due_date = paymentData.dueDate
      if (paymentData.paidDate !== undefined) updateData.paid_date = paymentData.paidDate
      if (paymentData.status !== undefined) updateData.status = paymentData.status
      if (paymentData.paymentMethod !== undefined) updateData.payment_method = paymentData.paymentMethod
      if (paymentData.referenceNumber !== undefined) updateData.reference_number = paymentData.referenceNumber
      if (paymentData.notes !== undefined) updateData.notes = paymentData.notes
      
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
      if (paymentData.paymentType !== undefined) updateData.payment_type = paymentData.paymentType
      if (paymentData.category !== undefined) updateData.expense_category = paymentData.category || null
      if (paymentData.paymentFrequency !== undefined) updateData.payment_frequency = paymentData.paymentFrequency || 'one-time'
      if (paymentData.transactionType !== undefined) updateData.transaction_type = paymentData.transactionType || 'regular'
      if (paymentData.managerName !== undefined) updateData.manager_name = paymentData.managerName || null
      if (paymentData.linkedAdvanceId !== undefined) updateData.linked_advance_id = paymentData.linkedAdvanceId || null

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
        .eq('payment_type', 'income')
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
        .eq('payment_type', 'expense')
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
        .eq('payment_type', 'expense')
        .order('due_date', { ascending: false })

      if (error) throw error

      return (data || []).map(p => this.mapToCamelCase(p))
    } catch (error) {
      console.error('Error fetching general expenses:', error.message)
      return []
    }
  }

  // Get all expenses (both general and project-related) for the General Expenses page
  async getAllExpenses() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) return []

      // Get all expense payments that are either general expenses or categorized project expenses
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('payment_type', 'expense')
        .not('expense_category', 'is', null)
        .order('due_date', { ascending: false })

      if (error) throw error

      return (data || []).map(p => this.mapToCamelCase(p))
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
  async getAdvances(managerName = null) {
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

        // Calculate settled amount for this advance
        const settledAmount = (settlements || [])
          .filter(s => s.linked_advance_id === advance.id)
          .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

        managerBalances[manager].totalSettled += settledAmount
      })

      // Calculate outstanding balance for each manager
      Object.keys(managerBalances).forEach(manager => {
        managerBalances[manager].outstandingBalance = 
          managerBalances[manager].totalAdvances - managerBalances[manager].totalSettled
      })

      return Object.values(managerBalances)
    } catch (error) {
      console.error('Error calculating outstanding advances:', error.message)
      return []
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
      paymentType: payment.payment_type || (payment.contract_id ? 'income' : 'expense'),
      expenseCategory: payment.expense_category || null,
      isGeneralExpense: !payment.project_id && payment.expense_category ? true : false,
      paymentNumber: payment.payment_number,
      amount: parseFloat(payment.amount) || 0,
      dueDate: payment.due_date,
      paidDate: payment.paid_date,
      status: payment.status,
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
      notes: payment.notes,
      paymentFrequency: payment.payment_frequency || 'one-time',
      transactionType: payment.transaction_type || 'regular',
      managerName: payment.manager_name || null,
      linkedAdvanceId: payment.linked_advance_id || null,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      createdBy: payment.created_by
    }
  }
}

const paymentsService = new PaymentsService()
export default paymentsService
