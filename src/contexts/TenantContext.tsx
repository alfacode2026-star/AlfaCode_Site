import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import tenantStore from '../services/tenantStore'
import { supabase } from '../services/supabaseClient'

interface TenantContextType {
  currentTenantId: string | null
  setCurrentTenantId: (tenantId: string | null) => void
  tenants: Array<{ id: string; name: string }>
  industryType: 'retail' | 'engineering' | 'services' | null
  refreshIndustryType: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

// Mock tenants for testing - in production, these would come from the database
const MOCK_TENANTS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'شركة أ' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'شركة ب' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'شركة ج' }
]

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTenantId, setCurrentTenantIdState] = useState<string | null>(null)
  const [industryType, setIndustryType] = useState<'retail' | 'engineering' | 'services' | null>(null)

  // Fetch industry_type from database
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

      if (!error && data) {
        // If data exists, check industry_type
        if (data.industry_type) {
          const industry = data.industry_type.toLowerCase()
          if (industry === 'retail' || industry === 'engineering' || industry === 'services') {
            setIndustryType(industry as 'retail' | 'engineering' | 'services')
          } else {
            setIndustryType(null)
          }
        } else {
          // Tenant exists but has no industry_type - set to null to trigger onboarding
          setIndustryType(null)
        }
      } else {
        // Database query failed or tenant doesn't exist - use fallback
        const fallbackMap: Record<string, 'retail' | 'engineering' | 'services'> = {
          '00000000-0000-0000-0000-000000000001': 'retail',
          '00000000-0000-0000-0000-000000000002': 'engineering',
          '00000000-0000-0000-0000-000000000003': 'services',
        }
        setIndustryType(fallbackMap[tenantId] || null)
      }
    } catch (error) {
      console.warn('Error fetching industry_type, using fallback:', error)
      // Fallback to hardcoded mapping
      const fallbackMap: Record<string, 'retail' | 'engineering' | 'services'> = {
        '00000000-0000-0000-0000-000000000001': 'retail',
        '00000000-0000-0000-0000-000000000002': 'engineering',
        '00000000-0000-0000-0000-000000000003': 'services',
      }
      setIndustryType(fallbackMap[tenantId] || null)
    }
  }

  // Initialize from tenantStore on mount
  useEffect(() => {
    const stored = tenantStore.getTenantId()
    if (stored) {
      setCurrentTenantIdState(stored)
      fetchIndustryType(stored)
    } else if (MOCK_TENANTS.length > 0) {
      // Set default tenant if none is set
      const defaultTenant = MOCK_TENANTS[0].id
      setCurrentTenantIdState(defaultTenant)
      tenantStore.setTenantId(defaultTenant)
      fetchIndustryType(defaultTenant)
    }
  }, [])

  const setCurrentTenantId = (tenantId: string | null) => {
    setCurrentTenantIdState(tenantId)
    tenantStore.setTenantId(tenantId)
    fetchIndustryType(tenantId)
    // Reload the page to refresh all data with new tenant context
    // This ensures all services fetch data for the new tenant
    window.location.reload()
  }

  const refreshIndustryType = async () => {
    await fetchIndustryType(currentTenantId)
  }

  const value: TenantContextType = {
    currentTenantId,
    setCurrentTenantId,
    tenants: MOCK_TENANTS,
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
