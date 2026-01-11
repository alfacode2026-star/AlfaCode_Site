import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'
import treasuryService from './treasuryService'

class IncomesService {
  // Get all incomes (received payments/advances per project)
  async getIncomes() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch incomes.')
        return []
      }

      // Get all payments that are income-type (have contract_id or payment_type = 'income')
      // Also include advances (transaction_type = 'advance') that are received
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          projects:project_id (
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .or('contract_id.not.is.null,payment_type.eq.income,transaction_type.eq.advance')
        .not('project_id', 'is', null)
        .order('due_date', { ascending: false })

      if (error) throw error

      // Map and filter to only include income-type payments
      const incomes = (payments || [])
        .filter(p => {
          // Include if it has contract_id (client payment) or payment_type is income
          // OR if it's an advance (received advance)
          return p.contract_id || p.payment_type === 'income' || p.transaction_type === 'advance'
        })
        .map(p => this.mapToCamelCase(p))

      return incomes
    } catch (error) {
      console.error('Error fetching incomes:', error.message)
      return []
    }
  }

  // Get income by ID
  async getIncome(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch income.')
        return null
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          projects:project_id (
            id,
            name
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error

      return this.mapToCamelCase(payment)
    } catch (error) {
      console.error('Error fetching income:', error.message)
      return null
    }
  }

  // Create new income/advance
  async createIncome(incomeData) {
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
      if (!incomeData.projectId) {
        return {
          success: false,
          error: 'معرف المشروع مطلوب',
          errorCode: 'PROJECT_ID_REQUIRED'
        }
      }

      if (!incomeData.amount || parseFloat(incomeData.amount) <= 0) {
        return {
          success: false,
          error: 'المبلغ يجب أن يكون أكبر من الصفر',
          errorCode: 'INVALID_AMOUNT'
        }
      }

      if (!incomeData.treasuryAccountId) {
        return {
          success: false,
          error: 'حساب الخزينة مطلوب',
          errorCode: 'TREASURY_ACCOUNT_REQUIRED'
        }
      }

      // Generate payment number
      const paymentNumber = incomeData.paymentNumber || `INC-${Date.now()}`

      // Determine transaction type based on income type
      let transactionType = 'regular'
      if (incomeData.incomeType === 'advance') {
        transactionType = 'advance'
      }

      // Create payment record
      const newPayment = {
        tenant_id: tenantId,
        contract_id: null, // Incomes can be standalone
        project_id: incomeData.projectId,
        work_scope: incomeData.workScope || null,
        expense_category: null,
        payment_number: paymentNumber,
        amount: parseFloat(incomeData.amount),
        remaining_amount: transactionType === 'advance' ? parseFloat(incomeData.amount) : null,
        due_date: incomeData.date || new Date().toISOString().split('T')[0],
        paid_date: incomeData.date || new Date().toISOString().split('T')[0],
        status: 'paid', // Incomes are considered paid when received
        payment_method: null,
        reference_number: incomeData.referenceNumber || null,
        notes: incomeData.description || null,
        recipient_name: null,
        payment_frequency: null,
        transaction_type: transactionType,
        manager_name: null,
        linked_advance_id: null,
        settlement_type: null,
        is_general_expense: false,
        payment_type: 'income', // Mark as income
        created_by: 'user'
      }

      const { data: insertedPayment, error: paymentError } = await supabase
        .from('payments')
        .insert([newPayment])
        .select()
        .single()

      if (paymentError) {
        console.error('Error creating income payment:', paymentError)
        return {
          success: false,
          error: paymentError.message || 'فشل في إنشاء سجل الدخل',
          errorCode: 'CREATE_PAYMENT_FAILED'
        }
      }

      // Create treasury transaction with POSITIVE amount (inflow)
      const amount = parseFloat(incomeData.amount)
      const treasuryResult = await treasuryService.createTransaction({
        accountId: incomeData.treasuryAccountId,
        transactionType: 'inflow', // IMPORTANT: inflow for income
        amount: amount, // POSITIVE amount
        referenceType: 'income',
        referenceId: insertedPayment.id,
        description: `وارد: ${incomeData.description || ''} - مشروع: ${incomeData.projectName || ''}`
      })

      if (!treasuryResult.success) {
        // Rollback: delete payment if treasury transaction failed
        await supabase.from('payments').delete().eq('id', insertedPayment.id)
        return {
          success: false,
          error: treasuryResult.error || 'فشل في إنشاء معاملة الخزينة',
          errorCode: 'TREASURY_TRANSACTION_FAILED'
        }
      }

      console.log('✅ Income created successfully:', {
        paymentId: insertedPayment.id,
        amount,
        treasuryAccountId: incomeData.treasuryAccountId,
        treasuryTransactionId: treasuryResult.transaction?.id
      })

      return {
        success: true,
        income: this.mapToCamelCase(insertedPayment),
        treasuryTransaction: treasuryResult.transaction
      }
    } catch (error) {
      console.error('Error creating income:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء الدخل',
        errorCode: 'CREATE_INCOME_FAILED'
      }
    }
  }

  // Update income
  async updateIncome(id, incomeData) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الدخل مطلوب',
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

      // Get existing payment to check amount difference
      const existingIncome = await this.getIncome(id)
      if (!existingIncome) {
        return {
          success: false,
          error: 'الدخل غير موجود',
          errorCode: 'INCOME_NOT_FOUND'
        }
      }

      const updateData = {}
      if (incomeData.amount !== undefined) updateData.amount = parseFloat(incomeData.amount)
      if (incomeData.date !== undefined) {
        updateData.due_date = incomeData.date
        updateData.paid_date = incomeData.date
      }
      if (incomeData.description !== undefined) updateData.notes = incomeData.description
      if (incomeData.referenceNumber !== undefined) updateData.reference_number = incomeData.referenceNumber
      if (incomeData.projectId !== undefined) updateData.project_id = incomeData.projectId
      if (incomeData.workScope !== undefined) updateData.work_scope = incomeData.workScope

      const { data: updatedPayment, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      // If amount or treasury account changed, update treasury transaction
      if (incomeData.amount !== undefined || incomeData.treasuryAccountId !== undefined) {
        // Note: Updating treasury transactions is complex - for now, we'll just log
        // In a production system, you might want to create a new transaction and reverse the old one
        console.warn('Treasury transaction update not implemented - amount/account changes require manual treasury adjustment')
      }

      return {
        success: true,
        income: this.mapToCamelCase(updatedPayment)
      }
    } catch (error) {
      console.error('Error updating income:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث الدخل',
        errorCode: 'UPDATE_INCOME_FAILED'
      }
    }
  }

  // Delete income
  async deleteIncome(id) {
    try {
      if (!id) {
        return {
          success: false,
          error: 'معرف الدخل مطلوب',
          errorCode: 'INVALID_ID'
        }
      }

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return {
          success: false,
          error: 'معرف المستأجر مطلوب',
          errorCode: 'NO_TENANT_ID'
        }
      }

      // Get income to find treasury transaction
      const income = await this.getIncome(id)
      if (income) {
        // Note: Deleting treasury transactions is complex - for now, we'll just delete the payment
        // In a production system, you might want to reverse the treasury transaction
        console.warn('Treasury transaction reversal not implemented - income deletion requires manual treasury adjustment')
      }

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting income:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف الدخل',
        errorCode: 'DELETE_INCOME_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase
  mapToCamelCase(payment) {
    if (!payment) return null

    return {
      id: payment.id,
      projectId: payment.project_id || null,
      projectName: payment.projects?.name || null,
      workScope: payment.work_scope || null,
      paymentNumber: payment.payment_number,
      amount: parseFloat(payment.amount) || 0,
      date: payment.due_date || payment.paid_date,
      incomeType: payment.transaction_type === 'advance' ? 'advance' : 
                  payment.payment_type === 'income' ? 'income' : 'milestone',
      description: payment.notes || null,
      referenceNumber: payment.reference_number || null,
      status: payment.status,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at
    }
  }
}

export default new IncomesService()
