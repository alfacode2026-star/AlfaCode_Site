import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
// @ts-expect-error - tenantStore is a .js file without type definitions
import tenantStore from '../services/tenantStore'
// @ts-expect-error - supabaseClient is a .js file without type definitions
import { supabase } from '../services/supabaseClient'
// @ts-expect-error - userManagementService is a .js file without type definitions
import userManagementService from '../services/userManagementService'

interface Branch {
  id: string
  name: string
  currency: string
  is_main?: boolean
}

interface BranchContextType {
  branchCurrency: string | null
  branchId: string | null
  branchName: string | null
  error: string | null
  refreshBranchData: () => Promise<void>
  setBranch: (branch: Branch) => Promise<void>
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

const STORAGE_KEY = 'selected_branch_id'
const STORAGE_TENANT_KEY = 'selected_branch_tenant_id'

export const BranchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [branchCurrency, setBranchCurrency] = useState<string | null>(null)
  const [branchId, setBranchId] = useState<string | null>(null)
  const [branchName, setBranchName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch branch data by branch ID
  const fetchBranchById = async (targetBranchId: string) => {
    setError(null)
    
    try {
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
        .eq('id', targetBranchId)
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
        const errorMsg = 'No branch record found. Please contact administrator.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(null)
        setBranchName(null)
        return
      }

      // Check if currency column is null/undefined
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

  const fetchBranchData = async () => {
    // Clear previous errors at start of fetch
    setError(null)
    
    try {
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

      // Check if there's a saved branch selection in localStorage (for super_admin switching)
      const savedBranchId = localStorage.getItem(STORAGE_KEY)
      const savedTenantId = localStorage.getItem(STORAGE_TENANT_KEY)
      
      // If saved branch exists and matches current tenant, use it
      if (savedBranchId && savedTenantId === tenantId) {
        console.log('🔄 [BranchContext] Using saved branch from localStorage:', savedBranchId)
        await fetchBranchById(savedBranchId)
        return
      }

      // Otherwise, get current user profile to get assigned branch_id
      const profile = await userManagementService.getCurrentUserProfile()
      
      // Check if user is super_admin
      const isSuperAdmin = profile?.role === 'super_admin'
      
      if (!profile?.branch_id && !isSuperAdmin) {
        const errorMsg = 'User has no branch_id assigned. Please contact administrator to assign a branch.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(null)
        setBranchName(null)
        return
      }

      // For super_admin without assigned branch, try to get main branch
      let targetBranchId = profile?.branch_id
      
      if (isSuperAdmin && !targetBranchId) {
        console.log('🔄 [BranchContext] Super admin without assigned branch, fetching main branch...')
        const { data: mainBranch } = await supabase
          .from('branches')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('is_main', true)
          .single()
        
        if (mainBranch?.id) {
          targetBranchId = mainBranch.id
          console.log('✅ [BranchContext] Using main branch for super_admin:', targetBranchId)
        }
      }

      if (!targetBranchId) {
        const errorMsg = 'No branch available. Please contact administrator.'
        console.error('❌', errorMsg)
        setError(errorMsg)
        setBranchCurrency(null)
        setBranchId(null)
        setBranchName(null)
        return
      }

      // Fetch branch data
      await fetchBranchById(targetBranchId)
    } catch (error: any) {
      const errorMsg = `Exception fetching branch data: ${error?.message || 'Unknown error'}`
      console.error('❌', errorMsg)
      setError(errorMsg)
      setBranchCurrency(null)
      setBranchId(null)
      setBranchName(null)
    }
  }

  // Manual branch selection (for super_admin switching)
  const setBranch = async (branch: Branch) => {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId) {
        throw new Error('No tenant ID set. Please select a company first.')
      }

      // Save to localStorage for persistence
      localStorage.setItem(STORAGE_KEY, branch.id)
      localStorage.setItem(STORAGE_TENANT_KEY, tenantId)
      
      console.log('✅ [BranchContext] Branch manually set:', {
        branchId: branch.id,
        branchName: branch.name,
        currency: branch.currency,
        tenantId
      })

      // Update state immediately
      setBranchId(branch.id)
      setBranchName(branch.name)
      setBranchCurrency(branch.currency || null)
      setError(null)
    } catch (error: any) {
      const errorMsg = `Error setting branch: ${error?.message || 'Unknown error'}`
      console.error('❌', errorMsg)
      setError(errorMsg)
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
    refreshBranchData,
    setBranch
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
