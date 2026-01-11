'use client'

import { Menu, Select, Divider } from 'antd'
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
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'

const { Option } = Select

const Navigation = () => {
  const navigate = useNavigate()
  const { currentTenantId, setCurrentTenantId, tenants, industryType } = useTenant()

  // Dynamic labels based on industry type
  const isEngineering = industryType === 'engineering'
  const productsLabel = isEngineering ? 'المواد والمعدات (Resources)' : 'المنتجات'
  const ordersLabel = 'أوامر الشراء / المصاريف'

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'لوحة التحكم',
    },
    // Show Quotations and Contracts only for engineering companies
    ...(isEngineering ? [
      {
        key: '/quotations',
        icon: <FileTextOutlined />,
        label: 'عروض الأسعار',
      },
      {
        key: '/contracts',
        icon: <FileProtectOutlined />,
        label: 'العقود',
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
      label: 'المشاريع',
    }] : []),
    // Show Labor page only for engineering companies
    ...(isEngineering ? [{
      key: '/labor',
      icon: <TeamOutlined />,
      label: 'يوميات العمال',
    }] : []),
    // Show General Expenses only for engineering companies
    ...(isEngineering ? [{
      key: '/general-expenses',
      icon: <BankOutlined />,
      label: 'المصاريف العامة والإدارية',
    }] : []),
    {
      key: '/treasury',
      icon: <WalletOutlined />,
      label: 'إدارة الخزينة',
    },
    // Admin Approvals - available for all (for now, just make the link available)
    {
      key: '/admin-approvals',
      icon: <SafetyOutlined />,
      label: 'اعتمادات الإدارة',
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: 'العملاء',
    },
    {
      key: '/suppliers',
      icon: <ShopOutlined />,
      label: 'الموردين',
    },
    {
      key: '/inventory',
      icon: <DatabaseOutlined />,
      label: productsLabel,
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'التقارير',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'الإعدادات',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tenant Switcher */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ marginBottom: '8px', color: '#666', fontSize: '12px', fontWeight: 500 }}>
          <ApartmentOutlined style={{ marginLeft: '4px' }} />
          تغيير الشركة
        </div>
        <Select
          value={currentTenantId}
          onChange={setCurrentTenantId}
          style={{ width: '100%' }}
          placeholder="اختر الشركة"
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