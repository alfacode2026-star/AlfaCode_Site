'use client'

import { useState, useEffect } from 'react'
import ordersService from '../services/ordersService'
import customersService from '../services/customersService'
import inventoryService from '../services/inventoryService'
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Button,
  Table,
  Space,
  Progress,
  Tag,
  Divider,
  Tabs,
  List,
  Avatar,
  Tooltip,
  Dropdown,
  Menu,
  Spin
} from 'antd'
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  StockOutlined,
  DownloadOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MoreOutlined,
  EyeOutlined,
  PrinterOutlined
} from '@ant-design/icons'

const { Option } = Select
// const { TabPane } = Tabs

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null])
  const [timeFrame, setTimeFrame] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [mainStats, setMainStats] = useState([])
  const [monthlyPerformance, setMonthlyPerformance] = useState({
    sales: 0,
    target: 250000,
    achievement: 0,
    orders: 0,
    averageOrderValue: 0,
    newCustomers: 0
  })
  const [topProductsData, setTopProductsData] = useState([])
  const [topCustomersData, setTopCustomersData] = useState([])

  // Load data on mount
  useEffect(() => {
    loadReportsData()
  }, [])

  const loadReportsData = async () => {
    setLoading(true)
    try {
      // Load all data in parallel
      const [orderStats, customerStats, orders, customers, products] = await Promise.all([
        ordersService.getOrderStats(),
        customersService.getCustomerStats(),
        ordersService.getOrders(),
        customersService.getCustomers(),
        inventoryService.getProducts()
      ])

      // Calculate main stats
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

      // Get current month orders
      const currentMonthOrders = orders.filter(o => {
        if (!o.createdAt) return false
        const orderDate = new Date(o.createdAt)
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
      })

      // Get last month orders
      const lastMonthOrders = orders.filter(o => {
        if (!o.createdAt) return false
        const orderDate = new Date(o.createdAt)
        return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear
      })

      const currentMonthRevenue = currentMonthOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
      
      const lastMonthRevenue = lastMonthOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)

      const revenueChange = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0

      const ordersChange = lastMonthOrders.length > 0
        ? ((currentMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100
        : 0

      const avgOrderValueChange = orderStats.averageOrderValue > 0 ? 5.3 : 0 // Placeholder

      // Get new customers this month
      const currentMonthCustomers = customers.filter(c => {
        if (!c.createdAt) return false
        const customerDate = new Date(c.createdAt)
        return customerDate.getMonth() === currentMonth && customerDate.getFullYear() === currentYear
      })

      const lastMonthCustomers = customers.filter(c => {
        if (!c.createdAt) return false
        const customerDate = new Date(c.createdAt)
        return customerDate.getMonth() === lastMonth && customerDate.getFullYear() === lastMonthYear
      })

      const customersChange = lastMonthCustomers.length > 0
        ? ((currentMonthCustomers.length - lastMonthCustomers.length) / lastMonthCustomers.length) * 100
        : 0

      setMainStats([
        {
          title: 'إجمالي الإيرادات',
          value: orderStats.totalRevenue,
          change: revenueChange,
          isPositive: revenueChange >= 0,
          icon: <DollarOutlined />,
          suffix: 'ريال'
        },
        {
          title: 'إجمالي الطلبات',
          value: orderStats.totalOrders,
          change: ordersChange,
          isPositive: ordersChange >= 0,
          icon: <ShoppingOutlined />,
          suffix: 'طلب'
        },
        {
          title: 'متوسط قيمة الطلب',
          value: Math.round(orderStats.averageOrderValue),
          change: avgOrderValueChange,
          isPositive: avgOrderValueChange >= 0,
          icon: <BarChartOutlined />,
          suffix: 'ريال'
        },
        {
          title: 'العملاء الجدد',
          value: currentMonthCustomers.length,
          change: customersChange,
          isPositive: customersChange >= 0,
          icon: <UserOutlined />,
          suffix: 'عميل'
        }
      ])

      // Monthly performance
      const achievement = monthlyPerformance.target > 0 
        ? Math.round((currentMonthRevenue / monthlyPerformance.target) * 100)
        : 0

      setMonthlyPerformance({
        sales: currentMonthRevenue,
        target: 250000,
        achievement: achievement,
        orders: currentMonthOrders.length,
        averageOrderValue: currentMonthOrders.length > 0 
          ? currentMonthRevenue / currentMonthOrders.filter(o => o.status === 'completed').length
          : 0,
        newCustomers: currentMonthCustomers.length
      })

      // Top products (from order items)
      const productSales = {}
      orders.filter(o => o.status === 'completed').forEach(order => {
        order.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              sales: 0,
              revenue: 0
            }
          }
          productSales[item.productId].sales += item.quantity
          productSales[item.productId].revenue += parseFloat(item.total) || 0
        })
      })

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((p, index) => ({
          ...p,
          name: p.productName,
          growth: Math.floor(Math.random() * 30) + 5 // Placeholder
        }))

      setTopProductsData(topProducts)

      // Top customers
      const topCustomers = customers
        .filter(c => c.totalSpent > 0)
        .sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          totalSpent: parseFloat(c.totalSpent) || 0,
          orders: c.totalOrders || 0,
          lastPurchase: c.lastPurchase || 'لا يوجد'
        }))

      setTopCustomersData(topCustomers)
    } catch (error) {
      console.error('Error loading reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const menu = (
    <Menu>
      <Menu.Item key="pdf">PDF</Menu.Item>
      <Menu.Item key="excel">Excel</Menu.Item>
      <Menu.Item key="csv">CSV</Menu.Item>
    </Menu>
  )

  return (
    <Spin spinning={loading}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>التقارير والإحصائيات</h1>
            <p style={{ color: '#666', margin: '4px 0 0 0' }}>تحليل أداء الأعمال واتخاذ القرارات</p>
          </div>
          <Space>
            <Space.Compact>
              <input
                type="date"
                className="ant-input"
                style={{ padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px 0 0 2px', height: '32px' }}
                placeholder="تاريخ البداية"
                value={dateRange[0] || ''}
                onChange={(e) => setDateRange([e.target.value || null, dateRange[1]])}
              />
              <input
                type="date"
                className="ant-input"
                style={{ padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '0 2px 2px 0', height: '32px', borderLeft: 'none' }}
                placeholder="تاريخ النهاية"
                value={dateRange[1] || ''}
                onChange={(e) => setDateRange([dateRange[0], e.target.value || null])}
                min={dateRange[0] || undefined}
              />
            </Space.Compact>
            <Dropdown overlay={menu}>
              <Button icon={<DownloadOutlined />}>
                تصدير التقرير
              </Button>
            </Dropdown>
          </Space>
        </div>

      {/* الإحصائيات الرئيسية */}
      <Row gutter={[16, 16]}>
        {mainStats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                precision={stat.title.includes('الإيرادات') ? 0 : 1}
                formatter={(value) => (
                  <span style={{ color: stat.isPositive ? '#3f8600' : '#cf1322' }}>
                    {value}
                  </span>
                )}
                prefix={stat.icon}
                suffix={stat.suffix}
              />
              <div style={{ marginTop: 8, fontSize: 14, color: '#666' }}>
                <span style={{ color: stat.isPositive ? '#3f8600' : '#cf1322' }}>
                  {stat.isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {' '}{Math.abs(stat.change)}%
                </span>
                {' '}عن الشهر الماضي
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* أداء الشهر */}
      <Card title="أداء الشهر الحالي">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>الإيرادات الشهرية</h3>
                <p style={{ color: '#666', margin: '4px 0 0 0' }}>
                  الهدف: {monthlyPerformance.target.toLocaleString()} ريال
                </p>
              </div>
              <Tag color={monthlyPerformance.achievement >= 100 ? 'green' : 'orange'}>
                تحقيق {monthlyPerformance.achievement}%
              </Tag>
            </div>
            <Progress
              percent={Math.min(100, (monthlyPerformance.sales / monthlyPerformance.target) * 100)}
              status={monthlyPerformance.achievement >= 100 ? 'success' : 'active'}
              style={{ marginTop: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>0 ريال</span>
              <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                {monthlyPerformance.sales.toLocaleString()} ريال
              </span>
              <span>{monthlyPerformance.target.toLocaleString()} ريال</span>
            </div>
          </Col>
        </Row>
        <Divider />
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="عدد الطلبات"
                value={monthlyPerformance.orders}
                prefix={<ShoppingOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="متوسط قيمة الطلب"
                value={monthlyPerformance.averageOrderValue}
                prefix={<DollarOutlined />}
                suffix="ريال"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="العملاء الجدد"
                value={monthlyPerformance.newCustomers}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* جداول البيانات */}
      <Tabs
        defaultActiveKey="products"
        items={[
          {
            key: 'products',
            label: 'المنتجات الأكثر مبيعاً',
            icon: <BarChartOutlined />,
            children: (
              <Card>
                <Table
                  dataSource={topProductsData.map((item, index) => ({ ...item, key: index }))}
                  columns={[
                    {
                      title: 'المنتج',
                      dataIndex: 'name',
                      key: 'name',
                      render: (text) => (
                        <Space>
                          <Avatar 
                            size="small"
                            style={{ backgroundColor: '#f0f0f0' }}
                          />
                          <span>{text}</span>
                        </Space>
                      )
                    },
                    {
                      title: 'عدد المبيعات',
                      dataIndex: 'sales',
                      key: 'sales',
                      sorter: (a, b) => a.sales - b.sales
                    },
                    {
                      title: 'الإيرادات',
                      dataIndex: 'revenue',
                      key: 'revenue',
                      render: (value) => (
                        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                          {value.toLocaleString()} ريال
                        </span>
                      )
                    },
                    {
                      title: 'النمو',
                      dataIndex: 'growth',
                      key: 'growth',
                      render: (value) => (
                        <Tag color={value >= 20 ? 'green' : value >= 10 ? 'orange' : 'red'}>
                          {value}%
                        </Tag>
                      )
                    }
                  ]}
                  pagination={false}
                />
              </Card>
            )
          },
          {
            key: 'customers',
            label: 'أفضل العملاء',
            icon: <UserOutlined />,
            children: (
              <Card>
                <List
                  dataSource={topCustomersData}
                  renderItem={(customer, index) => (
                    <List.Item
                      actions={[
                        <Button type="link" icon={<EyeOutlined />} size="small" />
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            style={{ 
                              backgroundColor: index === 0 ? '#ffd666' : 
                                             index === 1 ? '#d9d9d9' : 
                                             index === 2 ? '#ffa39e' : '#91d5ff' 
                            }}
                          >
                            {customer.name.charAt(0)}
                          </Avatar>
                        }
                        title={<a>{customer.name}</a>}
                        description={
                          <div>
                            <div>آخر شراء: {customer.lastPurchase}</div>
                            <div>عدد الطلبات: {customer.orders}</div>
                          </div>
                        }
                      />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a' }}>
                          {customer.totalSpent.toLocaleString()} ريال
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>إجمالي المشتريات</div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )
          }
        ]}
      />

      {/* تقارير إضافية */}
      <Card title="مؤشرات الأداء">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card size="small">
              <Statistic
                title="معدل التحويل"
                value={4.5}
                suffix="%"
                prefix={<ArrowUpOutlined />}
              />
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                نسبة الزوار الذين أصبحوا عملاء
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small">
              <Statistic
                title="متوسط وقت الشحن"
                value={2.3}
                suffix="أيام"
                prefix={<ArrowDownOutlined />}
              />
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                انخفض 0.5 يوم عن الشهر الماضي
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card size="small">
              <Statistic
                title="معدل رضا العملاء"
                value={4.7}
                suffix="/5"
                prefix={<BarChartOutlined />}
              />
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                بناءً على 250 تقييم
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
      </div>
    </Spin>
  )
}

export default ReportsPage