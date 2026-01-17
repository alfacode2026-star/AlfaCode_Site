'use client'

import { Menu, Select } from 'antd'
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined,
  ApartmentOutlined,
  RocketOutlined,
  FileTextOutlined,
  FileProtectOutlined,
  TeamOutlined,
  BankOutlined,
  WalletOutlined,
  SafetyOutlined,
  ShopOutlined,
  DollarOutlined,
  GlobalOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import userManagementService from '../services/userManagementService'
import { supabase } from '../services/supabaseClient'
import { Button, Divider } from 'antd'

const { Option } = Select

const Navigation = () => {
  const navigate = useNavigate()
  const { currentTenantId, setCurrentTenantId, tenants, industryType } = useTenant()
  const { language, setLanguage } = useLanguage()
  const t = getTranslations(language)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Check role function - memoized to avoid stale closures
  const checkRole = useCallback(async () => {
    try {
      const profile = await userManagementService.getCurrentUserProfile()
      const role = profile?.role || null
      setUserRole(role)
      setIsSuperAdmin(role === 'super_admin')
      
      console.log('✅ [Navigation] Role checked:', { role, isSuperAdmin: role === 'super_admin' })
    } catch (error) {
      console.error('❌ [Navigation] Error checking role:', error)
      setIsSuperAdmin(false)
      setUserRole(null)
    }
  }, [])

  // Check if user is super_admin and get role - Refresh when currentTenantId changes
  useEffect(() => {
    checkRole()
    
    // Also refresh role when currentTenantId changes (user switches company)
    // This ensures role is re-fetched after any context change
  }, [currentTenantId])
  
  // Listen to auth state changes (login/logout) to refresh role
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [Navigation] Auth state changed:', event)
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // User logged in or token refreshed - check role again
        console.log('🔐 [Navigation] User authenticated, refreshing role...')
        await checkRole()
      } else if (event === 'SIGNED_OUT') {
        // User logged out
        console.log('🚪 [Navigation] User signed out')
        setUserRole(null)
        setIsSuperAdmin(false)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [checkRole])
  
  // Periodically refresh role check (every 30 seconds) to detect DB updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const profile = await userManagementService.getCurrentUserProfile()
        const role = profile?.role || null
        if (role !== userRole) {
          console.log('🔄 [Navigation] Role changed detected:', { old: userRole, new: role })
          setUserRole(role)
          setIsSuperAdmin(role === 'super_admin')
        }
      } catch (error) {
        console.error('Error refreshing role:', error)
      }
    }, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [userRole])

  // Dynamic labels based on industry type
  const isEngineering = industryType === 'engineering'
  const productsLabel = isEngineering ? t.navigation.resources : t.navigation.products
  const ordersLabel = t.navigation.purchaseOrdersExpenses

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t.navigation.dashboard,
    },
    // Show Quotations and Contracts only for engineering companies
    ...(isEngineering ? [
      {
        key: '/quotations',
        icon: <FileTextOutlined />,
        label: t.navigation.quotations,
      },
      {
        key: '/quotation-builder',
        icon: <FileTextOutlined />,
        label: t.quotations.quotationBuilder,
      },
      {
        key: '/contracts',
        icon: <FileProtectOutlined />,
        label: t.navigation.contracts,
      },
    ] : []),
    {
      key: '/orders',
      icon: <ShoppingOutlined />,
      label: ordersLabel,
    },
    // Show Projects only for engineering companies
    ...(isEngineering ? [{
      key: '/projects',
      icon: <RocketOutlined />,
      label: t.navigation.projects,
    }] : []),
    // Show Labor page only for engineering companies
    ...(isEngineering ? [{
      key: '/labor',
      icon: <TeamOutlined />,
      label: t.navigation.laborStaffManagement,
    }] : []),
    // Show General Expenses only for engineering companies
    ...(isEngineering ? [{
      key: '/general-expenses',
      icon: <BankOutlined />,
      label: t.navigation.generalExpenses,
    }] : []),
    {
      key: '/treasury',
      icon: <WalletOutlined />,
      label: t.navigation.treasury,
    },
    // Show Incomes page only for engineering companies
    ...(isEngineering ? [{
      key: '/incomes',
      icon: <DollarOutlined />,
      label: t.navigation.incomesAdvances,
    }] : []),
    // Admin Approvals - available for all (for now, just make the link available)
    {
      key: '/admin-approvals',
      icon: <SafetyOutlined />,
      label: t.navigation.adminApprovals,
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: t.navigation.customers,
    },
    {
      key: '/suppliers',
      icon: <ShopOutlined />,
      label: t.navigation.suppliers,
    },
    {
      key: '/inventory',
      icon: <DatabaseOutlined />,
      label: productsLabel,
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: t.navigation.reports,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t.navigation.settings,
    },
    // Show Branches link only for super_admin - Strictly conditional
    ...(userRole === 'super_admin' ? [{
      key: '/settings/branches',
      icon: <ApartmentOutlined />,
      label: language === 'ar' ? 'الفروع' : 'Branches',
    }] : []),
  ]
  
  // DEBUG: Log menu items to verify Branches is included
  console.log('📋 [Navigation] Menu Items:', menuItems.map(item => ({
    key: item.key,
    label: item.label,
    isBranches: item.key === '/settings/branches'
  })))

  // DEBUG: Log role when rendering sidebar
  console.log('🔄 [Navigation] Rendering Sidebar with Role:', userRole, '| isSuperAdmin:', isSuperAdmin, '| userRole === super_admin:', userRole === 'super_admin')
  
  // Handle logout
  const handleLogout = async () => {
    try {
      console.log('🚪 [Navigation] Logging out...')
      await supabase.auth.signOut()
      
      // Clear localStorage
      localStorage.clear()
      
      // Redirect to setup/login page
      // Note: Since there's no /login route, redirecting to /setup or root
      // If you have a login page, change this to '/login'
      window.location.href = '/'
    } catch (error) {
      console.error('❌ [Navigation] Error during logout:', error)
      // Still try to redirect even if signOut fails
      localStorage.clear()
      window.location.href = '/'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Language Toggle */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px', fontWeight: 500 }}>
          <GlobalOutlined style={{ marginRight: '4px' }} />
          {t.navigation.language}
        </div>
        <Select
          value={language}
          onChange={setLanguage}
          style={{ width: '100%' }}
          placeholder={t.navigation.selectLanguage}
        >
          <Option value="en">{t.languageSelection.english}</Option>
          <Option value="ar">{t.languageSelection.arabic}</Option>
        </Select>
      </div>

      {/* Tenant Switcher */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px', fontWeight: 500 }}>
          <ApartmentOutlined style={{ marginRight: '4px' }} />
          {t.navigation.switchCompany}
        </div>
        <Select
          value={currentTenantId}
          onChange={setCurrentTenantId}
          style={{ width: '100%' }}
          placeholder={t.navigation.selectCompany}
        >
          {tenants.map((tenant) => (
            <Option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </Option>
          ))}
        </Select>
      </div>

      {/* Navigation Menu */}
      <Menu
        mode="inline"
        defaultSelectedKeys={['/']}
        style={{ flex: 1, border: 'none' }}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />

      {/* Logout Button - At the bottom */}
      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid #f0f0f0',
        marginTop: 'auto'
      }}>
        <Button
          type="text"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block
          style={{
            height: '40px',
            color: '#ff4d4f',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
        </Button>
      </div>
    </div>
  )
}

export default Navigation