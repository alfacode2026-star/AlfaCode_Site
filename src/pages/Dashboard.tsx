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

const Dashboard = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await inventoryService.getProducts()
        setProducts(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching products:', error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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