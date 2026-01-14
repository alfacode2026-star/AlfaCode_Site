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
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'

const { Option } = Select

const Navigation = () => {
  const navigate = useNavigate()
  const { currentTenantId, setCurrentTenantId, tenants, industryType } = useTenant()
  const { language, setLanguage } = useLanguage()
  const t = getTranslations(language)

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
  ]

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
    </div>
  )
}

export default Navigation