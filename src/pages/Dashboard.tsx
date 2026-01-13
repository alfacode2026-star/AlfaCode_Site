'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Button, Alert } from 'antd'
import { 
  ShoppingOutlined, 
  UserOutlined, 
  DatabaseOutlined,
  DollarOutlined,
  RocketOutlined,
  ArrowUpOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import inventoryService from '../services/inventoryService'
import paymentsService from '../services/paymentsService'
import { useTenant } from '../contexts/TenantContext'
import { useLanguage } from '../contexts/LanguageContext'
import { getTranslations } from '../utils/translations'
import { useFormatting } from '../utils/formatting'
import { RiseOutlined, FallOutlined } from '@ant-design/icons'

const Dashboard = () => {
  const navigate = useNavigate()
  const { industryType } = useTenant()
  const { language } = useLanguage()
  const t = getTranslations(language)
  const { formatCurrency } = useFormatting()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [financialMetrics, setFinancialMetrics] = useState({
    totalProjectsProfit: 0,
    totalGeneralExpenses: 0,
    netCompanyProfit: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [productsData] = await Promise.all([
          inventoryService.getProducts()
        ])
        setProducts(Array.isArray(productsData) ? productsData : [])

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
      } catch (error) {
        console.error('Error fetching data:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [industryType])

  // Calculate stats dynamically from products data
  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0)
  const lowStockCount = products.filter(p => (p.quantity || 0) <= (p.minQuantity || 0)).length

  const stats = [
    {
      title: t.dashboard.totalOrders,
      value: 128,
      icon: <ShoppingOutlined />,
      color: '#1890ff',
      link: '/orders'
    },
    {
      title: t.dashboard.totalCustomers,
      value: 45,
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
      suffix: t.common.sar,
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
      <Alert
        title={t.dashboard.welcomeMessage}
        description={t.dashboard.welcomeDescription}
        type="success"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* الإحصائيات */}
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
                suffix={t.common.sar}
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
                suffix={t.common.sar}
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
                suffix={<span style={{ color: 'white' }}>{t.common.sar || 'SAR'}</span>}
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