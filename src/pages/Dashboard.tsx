'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Button, Alert, Tag, Typography } from 'antd'
import { 
  ShoppingOutlined, 
  UserOutlined, 
  DatabaseOutlined,
  DollarOutlined,
  RocketOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  MailOutlined,
  SafetyOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import inventoryService from '../services/inventoryService'
import paymentsService from '../services/paymentsService'
import ordersService from '../services/ordersService'
import customersService from '../services/customersService'
import { useTenant } from '../contexts/TenantContext'
import { useBranch } from '../contexts/BranchContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useSyncStatus } from '../contexts/SyncStatusContext'
import { getTranslations } from '../utils/translations'
import { getCurrencySymbol } from '../utils/currencyUtils'
import { RiseOutlined, FallOutlined } from '@ant-design/icons'
import { supabase } from '../services/supabaseClient'
import tenantStore from '../services/tenantStore'
import branchStore from '../services/branchStore'
import userManagementService from '../services/userManagementService'

const { Text } = Typography

const Dashboard = () => {
  const navigate = useNavigate()
  const { industryType, currentTenantId } = useTenant()
  const { branchCurrency, branchName } = useBranch()
  const { language } = useLanguage()
  const { updateStatus } = useSyncStatus()
  const t = getTranslations(language)
  
  // Debug currency value
  console.log('💰 [Dashboard] Current Branch Currency:', branchCurrency)
  
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCurrencyWarning, setShowCurrencyWarning] = useState(false)
  const [financialMetrics, setFinancialMetrics] = useState({
    totalProjectsProfit: 0,
    totalGeneralExpenses: 0,
    netCompanyProfit: 0
  })
  
  // User info for System Status
  const [userInfo, setUserInfo] = useState<{
    email: string | null;
    role: string | null;
  }>({
    email: null,
    role: null
  })

  // Fetch user profile info for System Status
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const profile = await userManagementService.getCurrentUserProfile()
        if (profile) {
          setUserInfo({
            email: profile.email || null,
            role: profile.role || null
          })
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      }
    }
    fetchUserInfo()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        updateStatus('loading', language === 'ar' ? 'جاري تحديث لوحة المعلومات...' : 'Loading dashboard metrics...', branchName)
        const [productsData, ordersData, customersData] = await Promise.all([
          inventoryService.getProducts(),
          ordersService.getOrders(),
          customersService.getCustomers()
        ])
        setProducts(Array.isArray(productsData) ? productsData : [])
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setCustomers(Array.isArray(customersData) ? customersData : [])

        // Check if this is first run (no transactions/orders) and show currency warning
        if (currentTenantId) {
          try {
            const branchId = branchStore.getBranchId()
            
            // Only check if branch is selected (mandatory branch isolation)
            if (branchId) {
              const [ordersCheck, paymentsCheck] = await Promise.all([
                supabase
                  .from('orders')
                  .select('id')
                  .eq('tenant_id', currentTenantId)
                  .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
                  .limit(1),
                supabase
                  .from('payments')
                  .select('id')
                  .eq('tenant_id', currentTenantId)
                  .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
                  .limit(1)
              ])

              const hasOrders = ordersCheck.data && ordersCheck.data.length > 0
              const hasPayments = paymentsCheck.data && paymentsCheck.data.length > 0

              // Show warning only if NO transactions exist
              if (!hasOrders && !hasPayments) {
                // Check if user has dismissed this warning
                const dismissed = localStorage.getItem('currency_warning_dismissed')
                if (!dismissed) {
                  setShowCurrencyWarning(true)
                }
              }
            }
          } catch (error) {
            console.error('Error checking first run status:', error)
          }
        }

        // Calculate financial metrics for engineering companies
        if (industryType === 'engineering') {
          const allPayments = await paymentsService.getPayments()
          
          // Calculate total projects profit: income from projects - expenses from projects
          // Income = payments with contract_id (client payments) linked to projects
          const projectIncome = allPayments
            .filter(p => p.contractId && p.projectId && p.status === 'paid' && p.transactionType === 'regular')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          
          // Project expenses: expenses with project_id and expense_category (categorized project expenses)
          const projectExpenses = allPayments
            .filter(p => 
              !p.contractId &&
              p.projectId && 
              p.expenseCategory && 
              p.status === 'paid' &&
              p.transactionType === 'regular'
            )
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          
          // General expenses: expenses without project_id but with expense_category (administrative expenses)
          const generalExpensesTotal = allPayments
            .filter(p => 
              !p.contractId &&
              !p.projectId && 
              p.expenseCategory && 
              p.status === 'paid' &&
              p.transactionType === 'regular'
            )
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          
          const totalProjectsProfit = projectIncome - projectExpenses
          const netCompanyProfit = totalProjectsProfit - generalExpensesTotal

          setFinancialMetrics({
            totalProjectsProfit,
            totalGeneralExpenses: generalExpensesTotal,
            netCompanyProfit
          })
        }
        
        // Update sync status - Dashboard updated successfully
        updateStatus('success', language === 'ar' ? 'تم تحديث لوحة المعلومات' : 'Dashboard updated', branchName)
      } catch (error) {
        console.error('Error fetching data:', error)
        const errorMsg = language === 'ar' ? 'تعذر تحديث لوحة المعلومات' : 'Failed to update dashboard'
        updateStatus('error', errorMsg, branchName)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [industryType, updateStatus, language, branchName])

  // Calculate stats dynamically from real data
  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0)
  const lowStockCount = products.filter(p => (p.quantity || 0) <= (p.minQuantity || 0)).length
  const totalOrders = orders.length
  const totalCustomers = customers.length

  const stats = [
    {
      title: t.dashboard.totalOrders,
      value: totalOrders,
      icon: <ShoppingOutlined />,
      color: '#1890ff',
      link: '/orders'
    },
    {
      title: t.dashboard.totalCustomers,
      value: totalCustomers,
      icon: <UserOutlined />,
      color: '#52c41a',
      link: '/customers'
    },
    {
      title: t.dashboard.inventoryItems,
      value: totalProducts,
      icon: <DatabaseOutlined />,
      color: '#faad14',
      link: '/inventory'
    },
    {
      title: t.dashboard.inventoryValue,
      value: totalValue,
      icon: <DollarOutlined />,
      color: '#722ed1',
      suffix: branchCurrency || '',
      link: '/inventory'
    }
  ]

  const quickActions = [
    { label: t.dashboard.createNewOrder, icon: <ShoppingOutlined />, path: '/orders', type: 'primary' },
    { label: t.dashboard.addCustomer, icon: <UserOutlined />, path: '/customers' },
    { label: t.dashboard.manageInventory, icon: <DatabaseOutlined />, path: '/inventory' },
    { label: t.dashboard.viewReports, icon: <ArrowUpOutlined />, path: '/reports' }
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* First Run Currency Warning */}
      {showCurrencyWarning && branchCurrency && (
        <Alert
          message={language === 'ar' ? '⚠️ تنبيه مهم' : '⚠️ Important Notice'}
          description={
            <div>
              <p style={{ marginBottom: 8 }}>
                {language === 'ar'
                  ? `نظامك مضبوط للعمل بالعملة: ${branchCurrency}. بمجرد بدء العمل، لن يمكن تغيير هذه العملة.`
                  : `Your system is set to operate in ${branchCurrency}. Once you start working, this cannot be changed.`}
              </p>
              <p style={{ marginBottom: 0 }}>
                {language === 'ar'
                  ? 'انتقل إلى الإعدادات إذا كنت بحاجة لتعديلها الآن.'
                  : 'Go to Settings if you need to modify it now.'}
              </p>
            </div>
          }
          type="warning"
          showIcon
          closable
          onClose={() => {
            setShowCurrencyWarning(false)
            localStorage.setItem('currency_warning_dismissed', 'true')
          }}
          style={{ marginBottom: 24 }}
          action={
            <Button
              size="small"
              onClick={() => {
                navigate('/settings')
                setShowCurrencyWarning(false)
                localStorage.setItem('currency_warning_dismissed', 'true')
              }}
            >
              {language === 'ar' ? 'فتح الإعدادات' : 'Open Settings'}
            </Button>
          }
        />
      )}

      {/* Welcome Section with System Status */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Alert
            title={t.dashboard.welcomeMessage}
            description={t.dashboard.welcomeDescription}
            type="success"
            showIcon
            style={{ height: '100%' }}
          />
        </Col>
        <Col xs={24} lg={8}>
          <Card 
            title={
              <span>
                <SafetyOutlined style={{ marginRight: 8 }} />
                {language === 'ar' ? 'حالة النظام' : 'System Status'}
              </span>
            }
            style={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
              border: '1px solid #e8e8e8'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Account Type */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text strong>{language === 'ar' ? 'نوع الحساب:' : 'Account Type:'}</Text>
                {userInfo.role === 'super_admin' ? (
                  <Tag color="success" icon={<SafetyOutlined />} style={{ fontSize: '12px', padding: '4px 8px' }}>
                    {language === 'ar' ? 'مدير عام' : 'Super Admin'}
                  </Tag>
                ) : (
                  <Tag color="default" style={{ fontSize: '12px', padding: '4px 8px' }}>
                    {userInfo.role || (language === 'ar' ? 'مستخدم' : 'User')}
                  </Tag>
                )}
              </div>

              {/* Active Branch */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Text strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <EnvironmentOutlined />
                  {language === 'ar' ? 'الفرع النشط:' : 'Active Branch:'}
                </Text>
                <Text style={{ color: '#666', fontSize: '13px' }}>
                  {branchName || (language === 'ar' ? 'غير محدد' : 'Not Specified')}
                </Text>
              </div>

              {/* System User */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <Text strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MailOutlined />
                  {language === 'ar' ? 'المستخدم:' : 'System User:'}
                </Text>
                <Text style={{ color: '#666', fontSize: '12px' }} ellipsis={{ tooltip: userInfo.email }}>
                  {userInfo.email || (language === 'ar' ? 'غير محدد' : 'Not Available')}
                </Text>
              </div>

              {/* Status */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                paddingTop: 12,
                borderTop: '1px solid #e8e8e8'
              }}>
                <Text strong>{language === 'ar' ? 'الحالة:' : 'Status:'}</Text>
                <Tag 
                  color="success" 
                  icon={<CheckCircleOutlined />}
                  style={{ fontSize: '12px', padding: '4px 8px' }}
                >
                  {language === 'ar' ? 'النظام يعمل بشكل طبيعي' : 'System Healthy'}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card 
              hoverable 
              onClick={() => navigate(stat.link)}
              style={{ cursor: 'pointer' }}
            >
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                suffix={stat.suffix}
                styles={{ value: { color: stat.color } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Financial Metrics for Engineering Companies */}
      {industryType === 'engineering' && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title={t.dashboard.totalProjectsProfit}
                value={financialMetrics.totalProjectsProfit}
                precision={0}
                prefix={<RiseOutlined />}
                suffix={branchCurrency || ''}
                styles={{ value: { color: financialMetrics.totalProjectsProfit >= 0 ? '#3f8600' : '#cf1322' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title={t.dashboard.totalGeneralExpenses}
                value={financialMetrics.totalGeneralExpenses}
                precision={0}
                prefix={<FallOutlined />}
                suffix={branchCurrency || ''}
                styles={{ value: { color: '#cf1322' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card 
              style={{
                background: financialMetrics.netCompanyProfit >= 0 
                  ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                  : 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
                border: 'none'
              }}
            >
              <Statistic
                title={<span style={{ color: 'white', fontSize: '16px' }}>{t.dashboard.netCompanyProfit}</span>}
                value={financialMetrics.netCompanyProfit}
                precision={0}
                prefix={financialMetrics.netCompanyProfit >= 0 ? <RiseOutlined style={{ color: 'white' }} /> : <FallOutlined style={{ color: 'white' }} />}
                suffix={<span style={{ color: 'white' }}>{branchCurrency || ''}</span>}
                styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
              />
              <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                <div>{t.dashboard.projectsProfitMinusExpenses}</div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Quick Actions */}
      <Card title={t.dashboard.quickActions} style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col key={index}>
              <Button 
                type={action.type as any || 'default'} 
                icon={action.icon}
                size="large"
                onClick={() => navigate(action.path)}
              >
                {action.label}
              </Button>
            </Col>
          ))}
        </Row>
      </Card>

      {/* System Information */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t.dashboard.systemStatus}>
            <p>✅ {t.dashboard.viteReactWorking}</p>
            <p>✅ {t.dashboard.antDesignInstalled}</p>
            <p>✅ {t.dashboard.reactRouterWorking}</p>
            <p>✅ {t.dashboard.rtlSupportEnabled}</p>
            <p>✅ {t.dashboard.allPagesAvailable}</p>
            
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              style={{ marginTop: 16 }}
              onClick={() => navigate('/orders')}
            >
              {t.dashboard.startUsingSystem}
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title={t.dashboard.recentActivity}>
            <div style={{ padding: 8 }}>
              <p>📦 {t.dashboard.newOrdersAdded}</p>
              <p>👥 {t.dashboard.newCustomerRegistered}</p>
              <p>📊 {t.dashboard.salesReportsUpdated}</p>
              <p>🛒 {lowStockCount} {t.dashboard.productsNeedRestock}</p>
              <p>✅ {t.dashboard.systemRunningNormal}</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard