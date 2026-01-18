import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
// @ts-expect-error - tenantStore is a .js file without type definitions
import tenantStore from '../services/tenantStore'
// @ts-expect-error - supabaseClient is a .js file without type definitions
import { supabase } from '../services/supabaseClient'
import userManagementService from '../services/userManagementService'

interface TenantContextType {
  currentTenantId: string | null
  setCurrentTenantId: (tenantId: string | null) => void
  tenants: Array<{ id: string; name: string }>
  industryType: 'retail' | 'engineering' | 'services' | null
  refreshIndustryType: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(null)
  const [industryType, setIndustryType] = useState<'retail' | 'engineering' | 'services' | null>(null)
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([])

  // دالة لجلب نوع النشاط (Industry Type)
  const fetchIndustryType = async (tenantId: string | null) => {
    if (!tenantId) {
      setIndustryType(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('industry_type')
        .eq('id', tenantId)
        .single()

      if (!error && data?.industry_type) {
        const industry = data.industry_type.toLowerCase()
        if (['retail', 'engineering', 'services'].includes(industry)) {
          setIndustryType(industry as 'retail' | 'engineering' | 'services')
        } else {
          setIndustryType(null)
        }
      }
    } catch (error) {
      console.error('Error fetching industry_type:', error)
    }
  }

  // CRITICAL: Auto-resolve tenant_id from authenticated user's profile
  // This replaces the manual "Switch Company" dropdown - tenant is now derived from user session
  useEffect(() => {
    const initTenantFromUser = async () => {
      try {
        // 1. Get authenticated user's profile to extract tenant_id
        const profile = await userManagementService.getCurrentUserProfile()
        
        if (!profile) {
          console.warn('⚠️ [TenantContext] No user profile found. User may not be logged in.')
          // Don't set tenant if user is not logged in - auth guard will handle redirect
          return
        }

        // 2. Extract tenant_id from user profile (MANDATORY)
        const userTenantId = profile.tenant_id

        if (!userTenantId) {
          console.error('❌ [TenantContext] User profile has no tenant_id. Cannot initialize tenant context.')
          // This is a critical error - user must have a tenant_id assigned
          // The app should redirect to login/setup if this happens
          return
        }

        // 3. Verify tenant exists in database
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name, industry_type')
          .eq('id', userTenantId)
          .single()

        if (tenantError || !tenantData) {
          console.error('❌ [TenantContext] Tenant not found in database:', tenantError)
          return
        }

        // 4. Set tenant_id in state and store
        console.log('✅ [TenantContext] Auto-resolved tenant from user profile:', {
          tenantId: userTenantId,
          tenantName: tenantData.name,
          industryType: tenantData.industry_type
        })

        setCurrentTenantIdState(userTenantId)
        tenantStore.setTenantId(userTenantId)
        fetchIndustryType(userTenantId)

        // 5. Also set tenants array (single item) for backward compatibility
        // (Some components might still reference it, though dropdown is removed)
        setTenants([{ id: tenantData.id, name: tenantData.name }])

      } catch (error) {
        console.error('❌ [TenantContext] Error initializing tenant from user profile:', error)
        // Fail silently - auth guard will handle redirect if needed
      }
    }

    initTenantFromUser()
  }, [])

  const setCurrentTenantId = (tenantId: string | null) => {
    setCurrentTenantIdState(tenantId)
    tenantStore.setTenantId(tenantId)
    fetchIndustryType(tenantId)
    window.location.reload()
  }

  const refreshIndustryType = async () => {
    await fetchIndustryType(currentTenantId)
  }

  const value: TenantContextType = {
    currentTenantId,
    setCurrentTenantId,
    tenants, // الآن هذه القائمة تأتي من السيرفر مباشرة وتتحدث تلقائياً
    industryType,
    refreshIndustryType
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
