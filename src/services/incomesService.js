import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'
import treasuryService from './treasuryService'
import userManagementService from './userManagementService'
import logsService from './logsService'

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
      // EXCLUDE advances (transaction_type = 'advance') and settlements (transaction_type = 'settlement')
      // Only show real Revenues/Income (Invoices/Receipts from clients)
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch incomes.')
        return []
      }
      
      // CRITICAL: Include ALL income payments (contract_id OR payment_type='income'), even if project_id is null
      // This ensures contract payments from Contract Details appear in the main Revenue list
      let query = supabase
        .from('payments')
        .select(`
          *,
          projects:project_id (
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
        .or('contract_id.not.is.null,payment_type.eq.income')
        // REMOVED: .not('project_id', 'is', null) - Allow payments without project_id (contract payments may not have project_id)
        .neq('transaction_type', 'advance') // EXCLUDE advances (Custody)
        .neq('transaction_type', 'settlement') // EXCLUDE internal transfers/settlements

      const { data: payments, error } = await query.order('due_date', { ascending: false })

      if (error) throw error

      // Get treasury transactions for these payments to get account names
      const paymentIds = (payments || []).map(p => p.id)
      let treasuryAccountMap = {}
      
      if (paymentIds.length > 0) {
        const { data: treasuryTransactions, error: txnError } = await supabase
          .from('treasury_transactions')
          .select(`
            reference_id,
            account_id,
            treasury_accounts:account_id (
              id,
              name
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('reference_type', 'income')
          .in('reference_id', paymentIds)

        if (!txnError && treasuryTransactions) {
          // Create a map of payment ID -> account name
          treasuryTransactions.forEach(txn => {
            if (txn.reference_id && txn.treasury_accounts) {
              treasuryAccountMap[txn.reference_id] = txn.treasury_accounts.name
            }
          })
        }
      }

      // Map and filter to only include income-type payments (real revenues)
      // EXCLUDE advances and settlements (already filtered in query above)
      const incomes = (payments || [])
        .filter(p => {
          // Include only if it has contract_id (client payment) or payment_type is income
          // EXCLUDE advances (transaction_type = 'advance') and settlements (transaction_type = 'settlement')
          // These are already filtered in the query above, but double-check here for safety
          const isAdvance = p.transaction_type === 'advance'
          const isSettlement = p.transaction_type === 'settlement'
          if (isAdvance || isSettlement) {
            return false // EXCLUDE advances and internal transfers
          }
          return p.contract_id || p.payment_type === 'income'
        })
        .map(p => {
          const mapped = this.mapToCamelCase(p)
          // Add treasury account name from the map
          if (treasuryAccountMap[p.id]) {
            mapped.treasuryAccountName = treasuryAccountMap[p.id]
          }
          return mapped
        })

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

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch income.')
        return null
      }
      
      let query = supabase
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
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: payment, error } = await query.single()

      if (error) throw error

      // Get treasury account name for this payment
      let treasuryAccountName = null
      if (payment) {
        const { data: treasuryTransaction, error: txnError } = await supabase
          .from('treasury_transactions')
          .select(`
            account_id,
            treasury_accounts:account_id (
              id,
              name
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('reference_type', 'income')
          .eq('reference_id', id)
          .maybeSingle()

        if (!txnError && treasuryTransaction?.treasury_accounts) {
          treasuryAccountName = treasuryTransaction.treasury_accounts.name
        }
      }

      const mapped = this.mapToCamelCase(payment)
      if (treasuryAccountName) {
        mapped.treasuryAccountName = treasuryAccountName
      }
      return mapped
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

      // Ensure amount is positive and valid
      const amount = Math.abs(parseFloat(incomeData.amount))
      if (!incomeData.amount || amount <= 0 || isNaN(amount)) {
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

      // Get currency from treasury account if provided, otherwise default to SAR
      const currency = incomeData.currency || 'SAR'

      // AUTOMATIC BRANCH INJECTION: Get from branchStore
      const branchId = branchStore.getBranchId()

      // Create payment record
      // CRITICAL: Ensure amount is always positive for incomes
      const positiveAmount = Math.abs(amount)
      const newPayment = {
        tenant_id: tenantId,
        contract_id: null, // Incomes can be standalone
        project_id: incomeData.projectId,
        work_scope: incomeData.workScope || null,
        expense_category: null,
        payment_number: paymentNumber,
        amount: positiveAmount, // Always positive for incomes
        remaining_amount: transactionType === 'advance' ? positiveAmount : null,
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
        payment_type: 'income', // CRITICAL: Always mark as 'income' so filters can catch it
        completion_percentage: incomeData.completionPercentage || null,
        currency: currency, // Currency from treasury account
        created_by: 'user'
      }
      
      // MANDATORY BRANCH INJECTION: Always include branch_id (required)
      if (!branchId) {
        return {
          success: false,
          error: 'No branch ID set. Cannot create income.',
          errorCode: 'NO_BRANCH_ID'
        }
      }
      newPayment.branch_id = branchId

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
      // Use the same positiveAmount to ensure consistency
      const treasuryResult = await treasuryService.createTransaction({
        accountId: incomeData.treasuryAccountId,
        transactionType: 'inflow', // IMPORTANT: inflow for income
        amount: positiveAmount, // POSITIVE amount - always positive for incomes
        referenceType: 'income',
        referenceId: insertedPayment.id,
        description: `تمويل مشروع من مستثمر: ${incomeData.description || ''} - مشروع: ${incomeData.projectName || ''}`
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
      if (incomeData.completionPercentage !== undefined) updateData.completion_percentage = incomeData.completionPercentage

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
      }

      let query = supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data: updatedPayment, error } = await query.select().single()

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

  // Delete income (3-Layer Security Protocol)
  async deleteIncome(id, password, deletionReason) {
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

      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return { success: false, error: 'No branch ID set' }
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

      // Step 1: Get current user and income info
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

      // Step 3: Get income to find treasury transaction and for audit log
      const income = await this.getIncome(id)
      if (!income) {
        return {
          success: false,
          error: 'Income not found',
          errorCode: 'INCOME_NOT_FOUND'
        }
      }

      // Note: Deleting treasury transactions is complex - for now, we'll just delete the payment
      // In a production system, you might want to reverse the treasury transaction
      if (income) {
        console.warn('Treasury transaction reversal not implemented - income deletion requires manual treasury adjustment')
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
        tableName: 'payments',
        recordId: id,
        deletionReason: deletionReason.trim(),
        recordRef: income.paymentNumber || income.id, // Human-readable reference
        deletedData: income // Store snapshot of deleted record
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
      let query = supabase
        .from('payments')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { error } = await query

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

  // Check if a project has existing incomes
  async hasExistingIncomes(projectId) {
    try {
      if (!projectId) return false

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return false
      }

      // Check if there are any income payments for this project
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return false
      }

      let query = supabase
        .from('payments')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('project_id', projectId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
        .or('contract_id.not.is.null,payment_type.eq.income,transaction_type.eq.advance')

      const { data: payments, error } = await query.limit(1)

      if (error) {
        console.error('Error checking existing incomes:', error)
        return false
      }

      return (payments && payments.length > 0) || false
    } catch (error) {
      console.error('Error checking existing incomes:', error.message)
      return false
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
      completionPercentage: payment.completion_percentage || null,
      treasuryAccountName: payment.treasuryAccountName || null, // Will be set by caller if available
      createdAt: payment.created_at,
      updatedAt: payment.updated_at
    }
  }
}

export default new IncomesService()
