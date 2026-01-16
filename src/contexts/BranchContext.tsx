import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
// @ts-expect-error - tenantStore is a .js file without type definitions
import tenantStore from '../services/tenantStore'
// @ts-expect-error - supabaseClient is a .js file without type definitions
import { supabase } from '../services/supabaseClient'
// @ts-expect-error - userManagementService is a .js file without type definitions
import userManagementService from '../services/userManagementService'

interface BranchContextType {
  branchCurrency: string | null
  branchId: string | null
  branchName: string | null
  error: string | null
  refreshBranchData: () => Promise<void>
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branchCurrency, setBranchCurrency] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [branchName, setBranchName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchBranchData = async () => {
    // Clear previous errors at start of fetch
    setError(null)
    
    try {
      // Get current user profile to get branch_id
      const profile = await userManagementService.getCurrentUserProfile()
      
      if (!profile?.branch_id) {
        const errorMsg = 'User has no branch_id assigned. Please contact administrator to assign a branch.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(null)
        setBranchName(null)
        return
      }

      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        const errorMsg = 'No tenant ID set. Please select a company first.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(null)
        setBranchName(null)
        return
      }

      // Fetch branch data including currency
      const { data: branchData, error: queryError } = await supabase
        .from('branches')
        .select('id, name, currency')
        .eq('id', profile.branch_id)
        .eq('tenant_id', tenantId)
        .single()

      if (queryError) {
        const errorMsg = `Database Error: ${queryError.message}`
        console.error('❌ Error fetching branch data:', queryError)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(null)
        setBranchName(null)
        return
      }

      if (!branchData) {
        const errorMsg = 'No branch record found for this user. Please contact administrator.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(null)
        setBranchName(null)
        return
      }

      // Check if currency column is null/undefined (use optional chaining to prevent runtime crash)
      const currencyValue = typeof branchData.currency === 'string' ? branchData.currency.trim() : ''
      if (!branchData.currency || currencyValue === '') {
        const errorMsg = 'Branch found, but currency column is empty. Please set currency in Settings.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(branchData.id)
        setBranchName(branchData.name)
        return
      }

      // Success: Set all data and clear any previous errors
      setBranchCurrency(branchData.currency)
      setBranchId(branchData.id)
      setBranchName(branchData.name)
      setError(null) // Clear error on success
      console.log('✅ Branch currency loaded:', {
        branchId: branchData.id,
        branchName: branchData.name,
        currency: branchData.currency
      })
    } catch (error: any) {
      const errorMsg = `Exception fetching branch data: ${error?.message || 'Unknown error'}`
      console.error('❌', errorMsg)
      setError(errorMsg)
      setBranchCurrency(null)
      setBranchId(null)
      setBranchName(null)
    }
  }

  useEffect(() => {
    fetchBranchData()
  }, [])

  const refreshBranchData = async () => {
    await fetchBranchData()
  }

  const value: BranchContextType = {
    branchCurrency,
    branchId,
    branchName,
    error,
    refreshBranchData
  }

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
}

export const useBranch = (): BranchContextType => {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return context
}
