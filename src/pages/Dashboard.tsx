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
import { RiseOutlined, FallOutlined } from '@ant-design/icons'

const Dashboard = () => {
  const navigate = useNavigate()
  const { industryType } = useTenant()
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
        const [productsData, generalExpenses] = await Promise.all([
          inventoryService.getProducts(),
          industryType === 'engineering' ? paymentsService.getTotalGeneralExpenses() : Promise.resolve(0)
        ])
        setProducts(Array.isArray(productsData) ? productsData : [])

        // Calculate financial metrics for engineering companies
        if (industryType === 'engineering') {
          const allPayments = await paymentsService.getPayments()
          
          // Calculate total projects profit: income from projects - expenses from projects
          const projectIncome = allPayments
            .filter(p => p.paymentType === 'income' && p.projectId && p.status === 'paid')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          
          const projectExpenses = allPayments
            .filter(p => p.paymentType === 'expense' && p.projectId && !p.isGeneralExpense && p.status === 'paid')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          
          const totalProjectsProfit = projectIncome - projectExpenses
          const netCompanyProfit = totalProjectsProfit - generalExpenses

          setFinancialMetrics({
            totalProjectsProfit,
            totalGeneralExpenses: generalExpenses,
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
      title: 'إجمالي الطلبات',
      value: 128,
      icon: <ShoppingOutlined />,
      color: '#1890ff',
      link: '/orders'
    },
    {
      title: 'إجمالي العملاء',
      value: 45,
      icon: <UserOutlined />,
      color: '#52c41a',
      link: '/customers'
    },
    {
      title: 'عناصر المخزون',
      value: totalProducts,
      icon: <DatabaseOutlined />,
      color: '#faad14',
      link: '/inventory'
    },
    {
      title: 'قيمة المخزون',
      value: totalValue,
      icon: <DollarOutlined />,
      color: '#722ed1',
      suffix: 'ريال',
      link: '/inventory'
    }
  ]

  const quickActions = [
    { label: 'إنشاء طلب جديد', icon: <ShoppingOutlined />, path: '/orders', type: 'primary' },
    { label: 'إضافة عميل', icon: <UserOutlined />, path: '/customers' },
    { label: 'إدارة المخزون', icon: <DatabaseOutlined />, path: '/inventory' },
    { label: 'عرض التقارير', icon: <ArrowUpOutlined />, path: '/reports' }
  ]

  return (
    <div style={{ padding: 24 }}>
      <Alert
        title="مرحباً بك في نظام ERP المتكامل"
        description="تم نقل مشروعك بنجاح إلى Vite + React. النظام يعمل بكفاءة على الجهاز الجديد."
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
                title="ربح المشاريع الإجمالي"
                value={financialMetrics.totalProjectsProfit}
                precision={0}
                prefix={<RiseOutlined />}
                suffix="ريال"
                valueStyle={{ color: financialMetrics.totalProjectsProfit >= 0 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="إجمالي المصاريف العامة"
                value={financialMetrics.totalGeneralExpenses}
                precision={0}
                prefix={<FallOutlined />}
                suffix="ريال"
                valueStyle={{ color: '#cf1322' }}
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
                title={<span style={{ color: 'white', fontSize: '16px' }}>صافي ربح الشركة</span>}
                value={financialMetrics.netCompanyProfit}
                precision={0}
                prefix={financialMetrics.netCompanyProfit >= 0 ? <RiseOutlined style={{ color: 'white' }} /> : <FallOutlined style={{ color: 'white' }} />}
                suffix={<span style={{ color: 'white' }}>ريال</span>}
                valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
              />
              <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                <div>ربح المشاريع - المصاريف العامة</div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* الإجراءات السريعة */}
      <Card title="إجراءات سريعة" style={{ marginBottom: 24 }}>
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

      {/* معلومات النظام */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="حالة النظام">
            <p>✅ Vite + React يعملان بشكل صحيح</p>
            <p>✅ Ant Design مثبت ومفعل</p>
            <p>✅ React Router يعمل للتنقل بين الصفحات</p>
            <p>✅ الدعم العربي (RTL) مفعل</p>
            <p>✅ جميع صفحات ERP متوفرة</p>
            
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              style={{ marginTop: 16 }}
              onClick={() => navigate('/orders')}
            >
              ابدأ باستخدام النظام
            </Button>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="آخر النشاطات">
            <div style={{ padding: 8 }}>
              <p>📦 تم إضافة 3 طلبات جديدة</p>
              <p>👥 تم تسجيل عميل جديد</p>
              <p>📊 تم تحديث تقارير المبيعات</p>
              <p>🛒 {lowStockCount} منتجات تحتاج إعادة تعبئة</p>
              <p>✅ النظام يعمل بشكل طبيعي</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard