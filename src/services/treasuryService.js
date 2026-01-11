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
      return (data || []).map(txn => this.mapTransactionToCamelCase(txn))
    } catch (error) {
      console.error('Error fetching treasury transactions:', error.message)
      return []
    }
  }

  // Create treasury transaction and update account balance
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

      if (!transactionData.accountId) {
        return {
          success: false,
          error: 'Account ID is required',
          errorCode: 'NO_ACCOUNT_ID'
        }
      }

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

      // Verify account exists
      const account = await this.getAccount(transactionData.accountId)
      if (!account) {
        return {
          success: false,
          error: 'Account not found',
          errorCode: 'ACCOUNT_NOT_FOUND'
        }
      }

      // Store account ID before insert to avoid variable shadowing
      const accountId = transactionData.accountId

      // Create transaction record
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

      // Create transaction record FIRST
      const { data: insertedTransaction, error: transactionError } = await supabase
        .from('treasury_transactions')
        .insert([newTransaction])
        .select()
        .single()

      if (transactionError) throw transactionError

      // CRITICAL: After successful transaction insert, perform explicit UPDATE on treasury_accounts
      // Use atomic SQL expression: current_balance = current_balance + balanceChange
      // Since Supabase JS client doesn't support SQL expressions directly, we fetch current balance
      // and update it explicitly to ensure consistency
      const { data: currentAccount, error: fetchError } = await supabase
        .from('treasury_accounts')
        .select('current_balance')
        .eq('id', accountId)
        .eq('tenant_id', tenantId)
        .single()

      if (fetchError) {
        console.error('Failed to fetch current balance for update:', fetchError)
        throw new Error(`Failed to fetch account balance: ${fetchError.message}`)
      }

      // Calculate new balance explicitly: current_balance + balanceChange
      const currentBalance = parseFloat(currentAccount.current_balance) || 0
      const newBalance = currentBalance + balanceChange

      // Update account balance with explicit calculation
      const { data: updatedAccount, error: balanceError } = await supabase
        .from('treasury_accounts')
        .update({ current_balance: newBalance })
        .eq('id', accountId)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (balanceError) {
        // If balance update fails, the transaction creation is incomplete
        console.error('Balance update failed:', balanceError)
        throw new Error(`Failed to update account balance: ${balanceError.message}`)
      }

      return {
        success: true,
        transaction: this.mapTransactionToCamelCase(insertedTransaction),
        newBalance: newBalance
      }
    } catch (error) {
      console.error('Error creating treasury transaction:', error.message)
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
      createdAt: data.created_at
    }
  }
}

export default new TreasuryService()
