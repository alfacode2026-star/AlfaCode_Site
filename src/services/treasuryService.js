import { supabase } from './supabaseClient'
import tenantStore from './tenantStore'
import branchStore from './branchStore'
import { validateTenantId } from '../utils/tenantValidation'

class TreasuryService {
  // Get current user profile with branch_id
  async getCurrentUserProfile() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return null
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, tenant_id, branch_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.warn('Error fetching user profile:', profileError)
        return null
      }

      return profile
    } catch (error) {
      console.warn('Error getting current user profile:', error)
      return null
    }
  }

  // Get all treasury accounts (filtered by current tenant and branch)
  async getAccounts() {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch treasury accounts.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Use branchStore (Current Branch dropdown)
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch treasury accounts.')
        return []
      }

      // Build query with tenant filter
      let query = supabase
        .from('treasury_accounts')
        .select(`
          *,
          branches:branch_id (
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return (data || []).map(acc => this.mapAccountToCamelCase(acc))
    } catch (error) {
      console.error('Error fetching treasury accounts:', error.message)
      return []
    }
  }

  // Get account by ID (with tenant and branch check)
  async getAccount(id) {
    try {
      if (!id) return null

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch treasury account.')
        return null
      }

      // MANDATORY BRANCH ISOLATION: Use branchStore (Current Branch dropdown)
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch treasury account.')
        return null
      }

      // Build query with tenant filter
      let query = supabase
        .from('treasury_accounts')
        .select(`
          *,
          branches:branch_id (
            id,
            name
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

      const { data, error } = await query.single()

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

      // Get current user's branch_id from profile
      const userProfile = await this.getCurrentUserProfile()
      let branchId = userProfile?.branch_id

      // Fallback: If user doesn't have a branch_id, fetch the first available branch for this tenant
      if (!branchId) {
        console.warn('⚠️ User profile has no branch_id, fetching first available branch for tenant:', tenantId)
        try {
          const { data: branches, error: branchError } = await supabase
            .from('branches')
            .select('id')
            .eq('tenant_id', tenantId)
            .order('is_main', { ascending: false }) // Prefer main branch
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

          if (!branchError && branches) {
            branchId = branches.id
            console.log('✅ Using fallback branch_id:', branchId)
          } else if (branchError) {
            console.error('❌ Error fetching fallback branch:', branchError)
          } else {
            console.warn('⚠️ No branches found for tenant:', tenantId)
          }
        } catch (fallbackError) {
          console.error('❌ Exception during fallback branch fetch:', fallbackError)
        }
      }

      if (!branchId) {
        return {
          success: false,
          error: 'User branch not found. Please ensure your profile has a branch assigned or that at least one branch exists for this tenant.',
          errorCode: 'NO_BRANCH_ID'
        }
      }

      console.log('💾 Saving treasury account with Branch ID:', branchId)
      console.log('💾 Saving treasury account with Tenant ID:', tenantId)

      const accountId = accountData.id || crypto.randomUUID()
      const initialBalance = parseFloat(accountData.initialBalance) || 0

      // Clean payload - let Supabase generate id and timestamps
      // CRITICAL: currency must be a string (currency code like 'SAR', 'USD', 'IQD')
      const currencyValue = typeof accountData.currency === 'string' 
        ? accountData.currency.trim() 
        : (accountData.currency || 'SAR');

      const newAccount = {
        tenant_id: tenantId, // REQUIRED: tenant_id
        branch_id: branchId, // REQUIRED: branch_id (from profile or fallback)
        name: accountData.name, // REQUIRED: name
        type: accountData.type || 'bank', // 'bank' or 'cash_box'
        account_type: accountData.accountType || 'public', // 'public' or 'private'
        currency: currencyValue, // REQUIRED: currency code as string (e.g., 'SAR', 'USD', 'IQD')
        initial_balance: initialBalance,
        current_balance: initialBalance // Initialize current_balance to match initial_balance
      }

      console.log('📤 Treasury Account Payload:', {
        tenant_id: newAccount.tenant_id,
        branch_id: newAccount.branch_id,
        name: newAccount.name,
        type: newAccount.type,
        account_type: newAccount.account_type,
        currency: newAccount.currency, // Should be string like 'SAR', 'USD', etc.
        initial_balance: newAccount.initial_balance,
        current_balance: newAccount.current_balance
      });

      const { data, error } = await supabase
        .from('treasury_accounts')
        .insert([newAccount])
        .select(`
          *,
          branches:branch_id (
            id,
            name
          )
        `)
        .single()

      if (error) {
        console.error('❌ Error inserting treasury account:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Treasury account created successfully:', {
        id: data?.id,
        name: data?.name,
        currency: data?.currency
      });

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
      if (updates.accountType !== undefined) updateData.account_type = updates.accountType
      if (updates.currency !== undefined) updateData.currency = updates.currency

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

  // Get all treasury transactions (filtered by current tenant and branch)
  async getTransactions(accountId = null) {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        console.warn('No tenant ID set. Cannot fetch treasury transactions.')
        return []
      }

      // MANDATORY BRANCH ISOLATION: Use branchStore (Current Branch dropdown)
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        console.warn('No branch ID set. Cannot fetch treasury transactions.')
        return []
      }

      // Note: treasury_transactions table may not have branch_id column
      // Filter by accounts that belong to this branch instead
      // First, get account IDs for this branch
      const { data: branchAccounts, error: accountsError } = await supabase
        .from('treasury_accounts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)

      if (accountsError) {
        console.error('Error fetching branch accounts:', accountsError)
        return []
      }

      const branchAccountIds = (branchAccounts || []).map(acc => acc.id)
      
      if (branchAccountIds.length === 0) {
        return [] // No accounts for this branch
      }

      let query = supabase
        .from('treasury_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('account_id', branchAccountIds) // MANDATORY: Only transactions for branch accounts

      if (accountId) {
        // Verify account belongs to branch
        if (branchAccountIds.includes(accountId)) {
          query = query.eq('account_id', accountId)
        } else {
          return [] // Account doesn't belong to this branch
        }
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

      // Fetch payments with project_ids (MANDATORY BRANCH ISOLATION)
      const paymentProjectMap = {}
      if (paymentIds.length > 0) {
        const tenantId = tenantStore.getTenantId()
        const branchId = branchStore.getBranchId()
        
        if (!branchId) {
          // No branch ID - skip payment lookup
        } else {
          const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('id, project_id')
            .in('id', paymentIds)
            .eq('tenant_id', tenantId)
            .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

          if (!paymentsError && payments) {
            payments.forEach(payment => {
              if (payment.project_id) {
                paymentProjectMap[payment.id] = payment.project_id
              }
            })
          }
        }
      }

      // Fetch orders with project_ids (MANDATORY BRANCH ISOLATION)
      const orderProjectMap = {}
      if (orderIds.length > 0) {
        const tenantId = tenantStore.getTenantId()
        const branchId = branchStore.getBranchId()
        
        if (!branchId) {
          // No branch ID - skip order lookup
        } else {
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, project_id')
            .in('id', orderIds)
            .eq('tenant_id', tenantId)
            .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

          if (!ordersError && orders) {
            orders.forEach(order => {
              if (order.project_id) {
                orderProjectMap[order.id] = order.project_id
              }
            })
          }
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

      // Fetch project names (MANDATORY BRANCH ISOLATION)
      const projectNameMap = {}
      if (projectIds.size > 0) {
        const tenantId = tenantStore.getTenantId()
        const branchId = branchStore.getBranchId()
        
        if (!branchId) {
          // No branch ID - skip project lookup
        } else {
          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', Array.from(projectIds))
            .eq('tenant_id', tenantId)
            .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id

          if (!projectsError && projects) {
            projects.forEach(project => {
              projectNameMap[project.id] = project.name
            })
          }
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

      const transactionType = transactionData.transactionType || 'outflow' // 'inflow', 'outflow', 'deposit', or 'transfer'
      // 'deposit' is treated as 'inflow' for balance calculation
      const balanceChange = (transactionType === 'inflow' || transactionType === 'deposit') ? amount : -amount

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

    // Extract branch name from joined data
    const branchName = data.branches?.name || null
    const branchId = data.branch_id || null

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      accountType: data.account_type || 'public',
      currency: data.currency || 'SAR',
      currentBalance: parseFloat(data.current_balance) || 0,
      initialBalance: parseFloat(data.initial_balance) || 0,
      branchId: branchId,
      branchName: branchName,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  // Delete treasury transaction by reference_id (used when expense/payment is deleted)
  async deleteTransactionByReference(referenceType, referenceId) {
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

      if (!referenceType || !referenceId) {
        return {
          success: false,
          error: 'Reference type and ID are required',
          errorCode: 'INVALID_REFERENCE'
        }
      }

      // Find the transaction by reference
      const { data: transactions, error: findError } = await supabase
        .from('treasury_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('reference_type', referenceType)
        .eq('reference_id', referenceId)

      if (findError) {
        console.error('Error finding treasury transaction:', findError)
        return {
          success: false,
          error: `Failed to find transaction: ${findError.message}`,
          errorCode: 'FIND_TRANSACTION_FAILED'
        }
      }

      if (!transactions || transactions.length === 0) {
        // No transaction found - this is OK (expense might not have been paid yet)
        return { success: true, message: 'No treasury transaction found to reverse' }
      }

      // Reverse each transaction (there might be multiple if expense was edited)
      for (const transaction of transactions) {
        const accountId = transaction.account_id
        const amount = parseFloat(transaction.amount) || 0
        const transactionType = transaction.transaction_type // 'inflow' or 'outflow'
        
        // Reverse the balance change: if it was outflow, add it back (inflow), and vice versa
        const reverseBalanceChange = transactionType === 'outflow' ? amount : -amount

        // Get current account balance
        const { data: accountData, error: accountError } = await supabase
          .from('treasury_accounts')
          .select('current_balance')
          .eq('id', accountId)
          .eq('tenant_id', tenantId)
          .single()

        if (accountError || !accountData) {
          console.error('Error fetching account for reversal:', accountError)
          continue // Skip this transaction but continue with others
        }

        const currentBalance = parseFloat(accountData.current_balance) || 0
        const newBalance = currentBalance + reverseBalanceChange

        // Update account balance
        const { error: updateError } = await supabase
          .from('treasury_accounts')
          .update({ current_balance: newBalance })
          .eq('id', accountId)
          .eq('tenant_id', tenantId)

        if (updateError) {
          console.error('Error reversing account balance:', updateError)
          continue // Skip this transaction but continue with others
        }

        // Delete the transaction record
        const { error: deleteError } = await supabase
          .from('treasury_transactions')
          .delete()
          .eq('id', transaction.id)
          .eq('tenant_id', tenantId)

        if (deleteError) {
          console.error('Error deleting treasury transaction:', deleteError)
          // Balance was already reversed, so we continue
        }
      }

      return { success: true, reversed: transactions.length }
    } catch (error) {
      console.error('Error deleting treasury transaction by reference:', error)
      return {
        success: false,
        error: error.message || 'Failed to reverse treasury transaction',
        errorCode: 'DELETE_TRANSACTION_FAILED'
      }
    }
  }

  // Add Funds (Supply) - Manager/Super Admin only
  async addFunds(fundsData) {
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

      const accountId = fundsData.accountId
      const amount = parseFloat(fundsData.amount) || 0
      const date = fundsData.date || new Date().toISOString()
      const description = fundsData.description || fundsData.note || 'Funds added by manager'

      if (!accountId) {
        return {
          success: false,
          error: 'Account ID is required',
          errorCode: 'NO_ACCOUNT_ID'
        }
      }

      if (amount <= 0) {
        return {
          success: false,
          error: 'Amount must be greater than zero',
          errorCode: 'INVALID_AMOUNT'
        }
      }

      // Use createTransaction with 'deposit' type (treated as inflow)
      const result = await this.createTransaction({
        accountId: accountId,
        amount: amount,
        transactionType: 'deposit', // Type for manager-supplied funds
        description: description,
        referenceType: 'deposit',
        referenceId: crypto.randomUUID()
      })

      if (result.success) {
        // Update transaction date if provided
        if (date && date !== new Date().toISOString()) {
          const { error: updateError } = await supabase
            .from('treasury_transactions')
            .update({ created_at: date })
            .eq('id', result.transaction.id)
            .eq('tenant_id', tenantId)

          if (updateError) {
            console.warn('Failed to update transaction date:', updateError)
          }
        }
      }

      return result
    } catch (error) {
      console.error('Error adding funds:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to add funds',
        errorCode: 'ADD_FUNDS_FAILED'
      }
    }
  }

  // Transfer Funds between accounts with exchange rate
  async transferFunds(transferData) {
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

      const sourceAccountId = transferData.sourceAccountId
      const destinationAccountId = transferData.destinationAccountId
      const sourceAmount = parseFloat(transferData.sourceAmount) || 0
      const exchangeRate = parseFloat(transferData.exchangeRate) || 1.0
      const destinationAmount = parseFloat(transferData.destinationAmount) || (sourceAmount * exchangeRate)
      const description = transferData.description || 'Funds transfer between accounts'

      if (!sourceAccountId || !destinationAccountId) {
        return {
          success: false,
          error: 'Both source and destination accounts are required',
          errorCode: 'MISSING_ACCOUNTS'
        }
      }

      if (sourceAccountId === destinationAccountId) {
        return {
          success: false,
          error: 'Source and destination accounts cannot be the same',
          errorCode: 'SAME_ACCOUNT'
        }
      }

      if (sourceAmount <= 0) {
        return {
          success: false,
          error: 'Transfer amount must be greater than zero',
          errorCode: 'INVALID_AMOUNT'
        }
      }

      if (exchangeRate <= 0) {
        return {
          success: false,
          error: 'Exchange rate must be greater than zero',
          errorCode: 'INVALID_EXCHANGE_RATE'
        }
      }

      // Verify both accounts exist
      const { data: sourceAccount, error: sourceError } = await supabase
        .from('treasury_accounts')
        .select('id, current_balance, name, currency')
        .eq('id', sourceAccountId)
        .eq('tenant_id', tenantId)
        .single()

      if (sourceError || !sourceAccount) {
        return {
          success: false,
          error: `Source account not found: ${sourceAccountId}`,
          errorCode: 'SOURCE_ACCOUNT_NOT_FOUND'
        }
      }

      const { data: destAccount, error: destError } = await supabase
        .from('treasury_accounts')
        .select('id, current_balance, name, currency')
        .eq('id', destinationAccountId)
        .eq('tenant_id', tenantId)
        .single()

      if (destError || !destAccount) {
        return {
          success: false,
          error: `Destination account not found: ${destinationAccountId}`,
          errorCode: 'DEST_ACCOUNT_NOT_FOUND'
        }
      }

      // Check if source account has sufficient balance
      const sourceBalance = parseFloat(sourceAccount.current_balance) || 0
      if (sourceBalance < sourceAmount) {
        return {
          success: false,
          error: `Insufficient balance. Available: ${sourceBalance}, Required: ${sourceAmount}`,
          errorCode: 'INSUFFICIENT_BALANCE'
        }
      }

      // Use RPC function for atomic transfer (DO NOT update balances manually)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('perform_treasury_transfer', {
        p_tenant_id: tenantId,
        p_source_account_id: sourceAccountId,
        p_destination_account_id: destinationAccountId,
        p_source_amount: sourceAmount,
        p_exchange_rate: exchangeRate,
        p_destination_amount: destinationAmount,
        p_description: description
      })

      if (rpcError) {
        console.error('RPC transfer error:', rpcError)
        return {
          success: false,
          error: rpcError.message || 'Failed to transfer funds',
          errorCode: 'RPC_TRANSFER_FAILED'
        }
      }

      if (!rpcResult || !rpcResult.success) {
        return {
          success: false,
          error: rpcResult?.error || 'Transfer failed',
          errorCode: 'TRANSFER_FAILED'
        }
      }

      // Fetch the created transaction to return it
      const transactionId = rpcResult.transaction_id
      if (transactionId) {
        const { data: transaction, error: transactionError } = await supabase
          .from('treasury_transactions')
          .select('*')
          .eq('id', transactionId)
          .single()

        if (!transactionError && transaction) {
          return {
            success: true,
            transaction: this.mapTransactionToCamelCase(transaction),
            sourceAccount: {
              name: sourceAccount.name,
              newBalance: rpcResult.source_new_balance || (sourceBalance - sourceAmount)
            },
            destinationAccount: {
              name: destAccount.name,
              newBalance: rpcResult.destination_new_balance || (parseFloat(destAccount.current_balance) + destinationAmount)
            }
          }
        }
      }

      // Fallback response if transaction fetch fails
      return {
        success: true,
        sourceAccount: {
          name: sourceAccount.name
        },
        destinationAccount: {
          name: destAccount.name
        }
      }
    } catch (error) {
      console.error('Error transferring funds:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to transfer funds',
        errorCode: 'TRANSFER_FAILED'
      }
    }
  }

  // Helper: Map snake_case to camelCase for transactions
  mapTransactionToCamelCase(data) {
    if (!data) return null

    return {
      id: data.id,
      accountId: data.account_id,
      destinationAccountId: data.destination_account_id || null,
      transactionType: data.transaction_type,
      amount: parseFloat(data.amount) || 0,
      sourceAmount: parseFloat(data.source_amount) || null,
      destinationAmount: parseFloat(data.destination_amount) || null,
      exchangeRate: parseFloat(data.exchange_rate) || null,
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
