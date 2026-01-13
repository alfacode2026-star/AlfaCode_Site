import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
// @ts-expect-error - tenantStore is a .js file without type definitions
import tenantStore from '../services/tenantStore'
// @ts-expect-error - supabaseClient is a .js file without type definitions
import { supabase } from '../services/supabaseClient'

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

  // تهيئة النظام عند فتح الموقع
  useEffect(() => {
    const initTenants = async () => {
      // 1. جلب جميع الشركات الحقيقية الموجودة في النظام
      const { data: realTenants, error } = await supabase
        .from('tenants')
        .select('id, name, industry_type')

      if (error || !realTenants || realTenants.length === 0) {
        console.warn("No tenants found in DB yet.")
        return
      }

      // حفظ القائمة الحقيقية لاستخدامها في التبديل
      setTenants(realTenants)

      // 2. تحديد الشركة النشطة
      const storedId = tenantStore.getTenantId()
      
      // هل الشركة المخزنة في الذاكرة موجودة فعلاً في القائمة؟
      const isValidTenant = storedId && realTenants.find(t => t.id === storedId)

      if (isValidTenant) {
        // ممتاز، نستخدم الشركة المخزنة
        setCurrentTenantIdState(storedId)
        fetchIndustryType(storedId)
      } else {
        // الشركة المخزنة غير صالحة (أو قديمة)، نختار أول شركة متاحة تلقائياً
        const defaultTenant = realTenants[0]
        console.log("Auto-selecting tenant:", defaultTenant.name)
        setCurrentTenantIdState(defaultTenant.id)
        tenantStore.setTenantId(defaultTenant.id)
        fetchIndustryType(defaultTenant.id)
      }
    }

    initTenants()
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
