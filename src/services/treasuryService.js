import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import { validateTenantId } from '../utils/tenantValidation'

class TreasuryService {
  // Get all treasury accounts (filtered by current tenant)
  async getAccounts() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch treasury accounts.')
        return []
      }

      const { data, error } = await supabase
        .from('treasury_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map(acc => this.mapAccountToCamelCase(acc))
    } catch (error) {
      console.error('Error fetching treasury accounts:', error.message)
      return []
    }
  }

  // Get account by ID (with tenant check)
  async getAccount(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch treasury account.')
        return null
      }

      const { data, error } = await supabase
        .from('treasury_accounts')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error
      return this.mapAccountToCamelCase(data)
    } catch (error) {
      console.error('Error fetching treasury account:', error.message)
      return null
    }
  }

  // Add new treasury account
  async addAccount(accountData) {
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

      const accountId = accountData.id || crypto.randomUUID()
      const initialBalance = parseFloat(accountData.initialBalance) || 0

      const newAccount = {
        id: accountId,
        tenant_id: tenantId,
        name: accountData.name,
        type: accountData.type || 'bank', // 'bank' or 'cash_box'
        initial_balance: initialBalance,
        current_balance: initialBalance, // Initialize current_balance to match initial_balance
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('treasury_accounts')
        .insert([newAccount])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        account: this.mapAccountToCamelCase(data)
      }
    } catch (error) {
      console.error('Error adding treasury account:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في إضافة الحساب',
        errorCode: 'ADD_ACCOUNT_FAILED'
      }
    }
  }

  // Update treasury account
  async updateAccount(id, updates) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return {
          success: false,
          error: 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      const updateData = {
        updated_at: new Date().toISOString()
      }

      if (updates.name !== undefined) updateData.name = updates.name
      if (updates.type !== undefined) updateData.type = updates.type

      const { data, error } = await supabase
        .from('treasury_accounts')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        account: this.mapAccountToCamelCase(data)
      }
    } catch (error) {
      console.error('Error updating treasury account:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في تحديث الحساب',
        errorCode: 'UPDATE_ACCOUNT_FAILED'
      }
    }
  }

  // Delete treasury account
  async deleteAccount(id) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        return {
          success: false,
          error: 'Select a Company first',
          errorCode: 'NO_TENANT_ID'
        }
      }

      const { error } = await supabase
        .from('treasury_accounts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting treasury account:', error.message)
      return {
        success: false,
        error: error.message || 'فشل في حذف الحساب',
        errorCode: 'DELETE_ACCOUNT_FAILED'
      }
    }
  }

  // Get all treasury transactions (filtered by current tenant)
  async getTransactions(accountId = null) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch treasury transactions.')
        return []
      }

      let query = supabase
        .from('treasury_transactions')
        .select('*')
        .eq('tenant_id', tenantId)

      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      // Fetch project names for transactions
      const transactionsWithProjects = await this.enrichTransactionsWithProjectNames(data || [])

      return transactionsWithProjects.map(txn => this.mapTransactionToCamelCase(txn))
    } catch (error) {
      console.error('Error fetching treasury transactions:', error.message)
      return []
    }
  }

  // Helper: Enrich transactions with project names
  async enrichTransactionsWithProjectNames(transactions) {
    if (!transactions || transactions.length === 0) {
      return []
    }

    try {
      // Collect all reference IDs by type
      const paymentIds = []
      const orderIds = []

      transactions.forEach(txn => {
        if ((txn.reference_type === 'payment' || txn.reference_type === 'expense') && txn.reference_id) {
          paymentIds.push(txn.reference_id)
        } else if (txn.reference_type === 'order' && txn.reference_id) {
          orderIds.push(txn.reference_id)
        }
      })

      // Fetch payments with project_ids
      const paymentProjectMap = {}
      if (paymentIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('id, project_id')
          .in('id', paymentIds)
          .eq('tenant_id', tenantStore.getTenantId())

        if (!paymentsError && payments) {
          payments.forEach(payment => {
            if (payment.project_id) {
              paymentProjectMap[payment.id] = payment.project_id
            }
          })
        }
      }

      // Fetch orders with project_ids
      const orderProjectMap = {}
      if (orderIds.length > 0) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, project_id')
          .in('id', orderIds)

        if (!ordersError && orders) {
          orders.forEach(order => {
            if (order.project_id) {
              orderProjectMap[order.id] = order.project_id
            }
          })
        }
      }

      // Collect all unique project IDs
      const projectIds = new Set()
      Object.values(paymentProjectMap).forEach(pid => {
        if (pid) projectIds.add(pid)
      })
      Object.values(orderProjectMap).forEach(pid => {
        if (pid) projectIds.add(pid)
      })

      // Fetch project names
      const projectNameMap = {}
      if (projectIds.size > 0) {
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', Array.from(projectIds))
          .eq('tenant_id', tenantStore.getTenantId())

        if (!projectsError && projects) {
          projects.forEach(project => {
            projectNameMap[project.id] = project.name
          })
        }
      }

      // Enrich transactions with project names
      return transactions.map(txn => {
        let projectId = null
        if ((txn.reference_type === 'payment' || txn.reference_type === 'expense') && txn.reference_id) {
          projectId = paymentProjectMap[txn.reference_id] || null
        } else if (txn.reference_type === 'order' && txn.reference_id) {
          projectId = orderProjectMap[txn.reference_id] || null
        }

        const projectName = projectId ? (projectNameMap[projectId] || null) : null

        return {
          ...txn,
          project_id: projectId,
          project_name: projectName
        }
      })
    } catch (error) {
      console.error('Error enriching transactions with project names:', error.message)
      // Return transactions without project names if enrichment fails
      return transactions
    }
  }

  // Create treasury transaction and update account balance
  // ROBUST: Uses direct database UPDATE on current_balance field
  // IGNORES TYPE: Works with ANY account ID as long as it's valid
  async createTransaction(transactionData) {
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

      // Validate accountId - MUST be provided and valid
      if (!transactionData.accountId || (typeof transactionData.accountId === 'string' && transactionData.accountId.trim() === '')) {
        return {
          success: false,
          error: 'Account ID is required and cannot be empty',
          errorCode: 'NO_ACCOUNT_ID'
        }
      }

      const accountId = transactionData.accountId

      const amount = parseFloat(transactionData.amount) || 0
      if (amount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than zero',
          errorCode: 'INVALID_AMOUNT'
        }
      }

      const transactionType = transactionData.transactionType || 'outflow' // 'inflow' or 'outflow'
      const balanceChange = transactionType === 'inflow' ? amount : -amount

      // STEP 1: Verify account exists (IGNORE TYPE - check ANY account with this ID)
      const { data: accountData, error: accountCheckError } = await supabase
        .from('treasury_accounts')
        .select('id, current_balance, name, type')
        .eq('id', accountId)
        .eq('tenant_id', tenantId)
        .single()

      if (accountCheckError || !accountData) {
        console.error('Account ID not found:', { accountId, tenantId, error: accountCheckError })
        return {
          success: false,
          error: `Account ID not found: ${accountId}. ${accountCheckError?.message || 'Database error'}`,
          errorCode: 'ACCOUNT_NOT_FOUND'
        }
      }

      // STEP 2: Get current balance
      const currentBalance = parseFloat(accountData.current_balance) || 0
      const newBalance = currentBalance + balanceChange

      console.log('Treasury Transaction:', {
        accountId,
        accountName: accountData.name,
        accountType: accountData.type,
        currentBalance,
        balanceChange,
        newBalance,
        transactionType,
        amount
      })

      // STEP 3: Create transaction record FIRST
      const transactionId = transactionData.id || crypto.randomUUID()
      const newTransaction = {
        id: transactionId,
        tenant_id: tenantId,
        account_id: accountId,
        transaction_type: transactionType,
        amount: amount,
        reference_type: transactionData.referenceType || null, // 'payment', 'expense', 'order'
        reference_id: transactionData.referenceId || null,
        description: transactionData.description || null,
        created_at: new Date().toISOString()
      }

      const { data: insertedTransaction, error: transactionError } = await supabase
        .from('treasury_transactions')
        .insert([newTransaction])
        .select()
        .single()

      if (transactionError) {
        console.error('Failed to create transaction record:', transactionError)
        return {
          success: false,
          error: `Database update error: Failed to create transaction. ${transactionError.message}`,
          errorCode: 'TRANSACTION_INSERT_FAILED'
        }
      }

      // STEP 4: CRITICAL - Update account balance directly
      // Use direct UPDATE targeting current_balance field
      const { data: updatedAccount, error: balanceError } = await supabase
        .from('treasury_accounts')
        .update({ 
          current_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .eq('tenant_id', tenantId)
        .select('id, current_balance, name')
        .single()

      if (balanceError || !updatedAccount) {
        console.error('❌ Balance update failed:', { accountId, tenantId, error: balanceError })
        // Transaction was created but balance update failed - this is a critical error
        return {
          success: false,
          error: `Database update error: Failed to update account balance. Account ID: ${accountId}. ${balanceError?.message || 'Unknown error'}`,
          errorCode: 'BALANCE_UPDATE_FAILED'
        }
      }

      // Verify the balance was actually updated
      if (parseFloat(updatedAccount.current_balance) !== newBalance) {
        console.error('❌ Balance mismatch after update:', {
          expected: newBalance,
          actual: updatedAccount.current_balance,
          accountId
        })
        return {
          success: false,
          error: `Database update error: Balance mismatch. Expected ${newBalance}, got ${updatedAccount.current_balance}`,
          errorCode: 'BALANCE_MISMATCH'
        }
      }

      console.log('✅ Treasury transaction created successfully:', {
        transactionId: insertedTransaction.id,
        accountId,
        accountName: updatedAccount.name,
        oldBalance: currentBalance,
        newBalance,
        amount,
        transactionType
      })

      return {
        success: true,
        transaction: this.mapTransactionToCamelCase(insertedTransaction),
        newBalance: newBalance,
        accountName: updatedAccount.name
      }
    } catch (error) {
      console.error('❌ Error creating treasury transaction:', error)
      return {
        success: false,
        error: error.message || 'فشل في إنشاء المعاملة',
        errorCode: 'CREATE_TRANSACTION_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase for accounts
  mapAccountToCamelCase(data) {
    if (!data) return null

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      currentBalance: parseFloat(data.current_balance) || 0,
      initialBalance: parseFloat(data.initial_balance) || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  // Helper: Map snake_case to camelCase for transactions
  mapTransactionToCamelCase(data) {
    if (!data) return null

    return {
      id: data.id,
      accountId: data.account_id,
      transactionType: data.transaction_type,
      amount: parseFloat(data.amount) || 0,
      referenceType: data.reference_type,
      referenceId: data.reference_id,
      description: data.description,
      createdAt: data.created_at,
      projectId: data.project_id || null,
      projectName: data.project_name || null
    }
  }
}

export default new TreasuryService()
