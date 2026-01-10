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
      // For general expenses, contractId can be NULL
      // Otherwise, contractId is required
      if (!paymentData.isGeneralExpense && !paymentData.contractId) {
        return {
          success: false,
          error: 'معرف العقد مطلوب (أو حدد مصروف عام)',
          errorCode: 'CONTRACT_ID_REQUIRED'
        }
      }

      // Verify contract exists only if it's not a general expense
      if (!paymentData.isGeneralExpense && paymentData.contractId) {
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
        expense_category: paymentData.isGeneralExpense ? (paymentData.category || null) : null,
        payment_number: paymentNumber,
        amount: paymentData.amount || 0,
        due_date: paymentData.dueDate,
        paid_date: paymentData.paidDate || null,
        status: paymentData.status || 'pending',
        payment_method: paymentData.paymentMethod || null,
        reference_number: paymentData.referenceNumber || null,
        notes: paymentData.notes || null,
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
      if (paymentData.projectId !== undefined) updateData.project_id = paymentData.projectId || null
      if (paymentData.workScope !== undefined) updateData.work_scope = paymentData.workScope || null
      if (paymentData.paymentType !== undefined) updateData.payment_type = paymentData.paymentType

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
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      createdBy: payment.created_by
    }
  }
}

const paymentsService = new PaymentsService()
export default paymentsService
