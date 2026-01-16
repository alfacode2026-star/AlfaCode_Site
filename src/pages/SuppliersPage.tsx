'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import { useBranch } from '../contexts/BranchContext'
import customersService from '../services/customersService'
import ordersService from '../services/ordersService'
import paymentsService from '../services/paymentsService'
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Avatar,
  Popconfirm,
  message,
  Tabs,
  Descriptions,
  Divider
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ShoppingOutlined,
  StarOutlined,
  ExportOutlined,
  ShopOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'

const { Option } = Select

const SuppliersPage = () => {
  const { branchCurrency } = useBranch()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [supplierTransactions, setSupplierTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('all')

  // Load suppliers on mount
  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const [data, orders] = await Promise.all([
        customersService.loadCustomers(),
        ordersService.getOrders()
      ])
      
      // Filter to only suppliers (type = 'supplier')
      const suppliersData = (Array.isArray(data) ? data : [])
        .filter(c => c.type === 'supplier')
        .map(c => {
          // Calculate total purchases from orders where customer_id matches supplier ID
          const supplierOrders = orders.filter(order => order.customerId === c.id)
          const totalPurchases = supplierOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0)
          
          // Calculate balance (total purchases - total payments, but for now use total purchases as balance indicator)
          // Note: Balance should be calculated from payments if available, but for now we'll use total purchases
          return { 
            ...c, 
            key: c.id || c.key || `supplier-${Date.now()}-${Math.random()}`,
            totalSpent: totalPurchases,
            // Balance can be calculated from payments if needed, for now use total purchases
            balance: c.balance !== undefined ? c.balance : 0
          }
        })
      
      setSuppliers(suppliersData)
    } catch (error) {
      console.error('Error loading suppliers:', error)
      message.error('فشل في تحميل بيانات الموردين')
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const loadSupplierTransactions = async (supplierId) => {
    if (!supplierId) {
      setSupplierTransactions([])
      return
    }

    setTransactionsLoading(true)
    try {
      // Load orders (purchases) where customer_id matches the supplier
      const orders = await ordersService.getOrders()
      const supplierOrders = orders.filter(order => order.customerId === supplierId)

      // Load payments (expense payments) - filter by recipient_name or check if related to supplier
      const payments = await paymentsService.getPayments()
      // Filter expense payments that might be related to this supplier
      // For now, we'll show orders. Payments can be added later if needed
      const supplierPayments = []

      // Combine and format transactions
      const transactions = [
        ...supplierOrders.map(order => ({
          id: order.id,
          type: 'purchase',
          typeLabel: 'أمر شراء',
          date: order.createdAt,
          amount: parseFloat(order.total) || 0,
          status: order.status,
          reference: order.id,
          description: `أمر شراء ${order.id}`
        })),
        ...supplierPayments.map(payment => ({
          id: payment.id,
          type: 'payment',
          typeLabel: 'دفعة',
          date: payment.paidDate || payment.dueDate,
          amount: parseFloat(payment.amount) || 0,
          status: payment.status,
          reference: payment.paymentNumber,
          description: `دفعة ${payment.paymentNumber}`
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

      setSupplierTransactions(transactions)
    } catch (error) {
      console.error('Error loading supplier transactions:', error)
      message.error('فشل في تحميل سجل المعاملات')
      setSupplierTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }

  // إحصائيات
  const stats = {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter(s => s.status === 'active').length,
    totalBalance: suppliers.reduce((sum, s) => sum + (s.balance || 0), 0),
    totalPurchases: suppliers.reduce((sum, s) => sum + (s.totalSpent || 0), 0)
  }

  // أعمدة الجدول
  const columns = [
    {
      title: 'المورد',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <Avatar 
            size="large" 
            style={{ backgroundColor: record.status === 'active' ? '#1890ff' : '#ff4d4f' }}
            icon={<ShopOutlined />}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{record.email}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'معلومات الاتصال',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div><PhoneOutlined style={{ marginLeft: 4 }} /> {record.phone}</div>
          {record.company && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {record.company}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'نشط' : 'غير نشط'}
        </Tag>
      )
    },
    {
      title: 'الرصيد',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: balance >= 0 ? '#52c41a' : '#ff4d4f' 
        }}>
          {balance.toLocaleString()} ريال
        </span>
      ),
      sorter: (a, b) => a.balance - b.balance
    },
    {
      title: 'إجمالي المشتريات',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (total) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {total.toLocaleString()} ريال
        </span>
      )
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedSupplier(record)
              setViewModalVisible(true)
              loadSupplierTransactions(record.id)
            }}
            title="عرض التفاصيل"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="تعديل"
          />
          <Popconfirm
            title="حذف المورد"
            description="هل أنت متأكد من حذف هذا المورد؟"
            onConfirm={() => handleDelete(record.key)}
            okText="نعم"
            cancelText="لا"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              title="حذف"
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // فلترة الموردين
  const filteredSuppliers = (Array.isArray(suppliers) ? suppliers : []).filter(supplier => {
    if (!supplier) return false
    
    const matchesSearch =
      supplier.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      supplier.phone?.includes(searchText)
    
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter
    const matchesTab = activeTab === 'all' || supplier.status === activeTab
    
    return matchesSearch && matchesStatus && matchesTab
  })

  const handleDelete = async (key) => {
    try {
      const result = await customersService.deleteCustomer(key)
      if (result.success) {
        message.success('تم حذف المورد بنجاح')
        loadSuppliers()
      } else {
        message.error(result.error || 'فشل في حذف المورد')
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      message.error('حدث خطأ أثناء حذف المورد')
    }
  }

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier)
    form.setFieldsValue({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      company: supplier.company,
      address: supplier.address,
      status: supplier.status,
      notes: supplier.notes,
      type: 'supplier' // Always set type to supplier
    })
    setIsModalVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      values.type = 'supplier' // Ensure type is always 'supplier'
      
      if (selectedSupplier) {
        // تعديل مورد موجود
        const result = await customersService.updateCustomer(selectedSupplier.id, values, null)
        
        if (result.success) {
          message.success('تم تحديث بيانات المورد بنجاح')
          setIsModalVisible(false)
          setSelectedSupplier(null)
          form.resetFields()
          loadSuppliers()
        } else {
          message.error(result.error || 'فشل في تحديث بيانات المورد')
        }
      } else {
        // إضافة مورد جديد
        const result = await customersService.addCustomer(values)
        
        if (result.success) {
          message.success('تم إضافة المورد بنجاح')
          setIsModalVisible(false)
          setSelectedSupplier(null)
          form.resetFields()
          loadSuppliers()
        } else {
          message.error(result.error || 'فشل في إضافة المورد')
        }
      }
    } catch (error) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح')
      } else {
        message.error('حدث خطأ أثناء حفظ المورد')
      }
    }
  }

  // Transaction columns for detail view
  const transactionColumns = [
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      render: (date) => {
        if (!date) return 'غير محدد'
        const parsed = moment(date)
        return parsed.isValid() ? parsed.format('DD-MMM-YYYY HH:mm') : '-'
      },
      sorter: (a, b) => {
        const dateA = a?.date ? new Date(a.date).getTime() : 0
        const dateB = b?.date ? new Date(b.date).getTime() : 0
        return dateA - dateB
      },
      defaultSortOrder: 'descend'
    },
    {
      title: 'النوع',
      dataIndex: 'typeLabel',
      key: 'typeLabel',
      render: (label, record) => (
        <Tag color={record.type === 'purchase' ? 'blue' : 'green'}>
          {label}
        </Tag>
      )
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>
          -{amount.toLocaleString()} ريال
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0)
    },
    {
      title: 'المرجع',
      dataIndex: 'reference',
      key: 'reference',
      render: (reference) => (
        <Tag color="blue">{reference}</Tag>
      )
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          'pending': { color: 'orange', label: 'قيد الانتظار' },
          'paid': { color: 'green', label: 'مدفوع' },
          'completed': { color: 'green', label: 'مكتمل' },
          'cancelled': { color: 'red', label: 'ملغي' }
        }
        const statusInfo = statusMap[status] || { color: 'default', label: status }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      }
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>إدارة الموردين</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>إدارة قاعدة موردين الشركة</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setSelectedSupplier(null)
          form.resetFields()
          form.setFieldsValue({ type: 'supplier', status: 'active' })
          setIsModalVisible(true)
        }}>
          إضافة مورد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي الموردين"
              value={stats.totalSuppliers}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="الموردين النشطين"
              value={stats.activeSuppliers}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي الرصيد"
              value={stats.totalBalance}
              prefix={<DollarOutlined />}
              suffix={branchCurrency || 'SAR'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي المشتريات"
              value={stats.totalPurchases}
              prefix={<ShoppingOutlined />}
              suffix={branchCurrency || 'SAR'}
            />
          </Card>
        </Col>
      </Row>

      {/* أدوات البحث والتصفية */}
      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Input
            placeholder="ابحث باسم المورد أو البريد أو الهاتف..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="حالة المورد"
          >
            <Option value="all">الكل</Option>
            <Option value="active">نشط</Option>
            <Option value="inactive">غير نشط</Option>
          </Select>
          <Button icon={<ExportOutlined />} onClick={() => {
            const dataStr = JSON.stringify(suppliers, null, 2)
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
            const exportFileDefaultName = 'suppliers.json'
            const linkElement = document.createElement('a')
            linkElement.setAttribute('href', dataUri)
            linkElement.setAttribute('download', exportFileDefaultName)
            linkElement.click()
            message.success('تم تصدير البيانات بنجاح')
          }}>
            تصدير
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: 'الكل' },
            { key: 'active', label: 'نشط' },
            { key: 'inactive', label: 'غير نشط' }
          ]}
        />
      </Card>

      {/* جدول الموردين */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredSuppliers}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey="key"
        />
      </Card>

      {/* Modal إضافة/تعديل مورد */}
      <Modal
        title={selectedSupplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedSupplier(null)
          form.resetFields()
        }}
        okText={selectedSupplier ? "تحديث" : "إضافة"}
        cancelText="إلغاء"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="اسم المورد"
                rules={[{ required: true, message: 'يرجى إدخال اسم المورد' }]}
              >
                <Input placeholder="أدخل اسم المورد" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="البريد الإلكتروني"
                rules={[
                  { required: true, message: 'يرجى إدخال البريد الإلكتروني' },
                  { type: 'email', message: 'يرجى إدخال بريد إلكتروني صحيح' }
                ]}
              >
                <Input placeholder="أدخل البريد الإلكتروني" prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="رقم الهاتف"
                rules={[
                  { required: true, message: 'يرجى إدخال رقم الهاتف' },
                  {
                    pattern: /^(\+?\d[\d\s-]{7,14})$/,
                    message: 'يرجى إدخال رقم هاتف صحيح'
                  }
                ]}
              >
                <Input placeholder="أدخل رقم الهاتف" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="company"
                label="اسم الشركة (اختياري)"
              >
                <Input placeholder="أدخل اسم الشركة" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label="العنوان"
          >
            <Input.TextArea
              rows={2}
              placeholder="أدخل العنوان"
              prefix={<EnvironmentOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="الحالة"
            initialValue="active"
          >
            <Select>
              <Option value="active">نشط</Option>
              <Option value="inactive">غير نشط</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="ملاحظات (اختياري)"
          >
            <Input.TextArea rows={3} placeholder="ملاحظات إضافية عن المورد..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal عرض التفاصيل مع سجل المعاملات */}
      <Modal
        title={`تفاصيل المورد - ${selectedSupplier?.name}`}
        open={viewModalVisible}
        onCancel={() => {
          setViewModalVisible(false)
          setSupplierTransactions([])
        }}
        footer={[
          <Button key="close" onClick={() => {
            setViewModalVisible(false)
            setSupplierTransactions([])
          }}>
            إغلاق
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setViewModalVisible(false)
              setSupplierTransactions([])
              handleEdit(selectedSupplier)
            }}
          >
            تعديل البيانات
          </Button>
        ]}
        width={900}
      >
        {selectedSupplier && (
          <div style={{ marginTop: 24 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="رقم المورد">{selectedSupplier.id}</Descriptions.Item>
              <Descriptions.Item label="الاسم">{selectedSupplier.name}</Descriptions.Item>
              <Descriptions.Item label="البريد الإلكتروني">{selectedSupplier.email}</Descriptions.Item>
              <Descriptions.Item label="الهاتف">{selectedSupplier.phone}</Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color={selectedSupplier.status === 'active' ? 'green' : 'red'}>
                  {selectedSupplier.status === 'active' ? 'نشط' : 'غير نشط'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="الرصيد">
                <span style={{
                  fontWeight: 'bold',
                  color: selectedSupplier.balance >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  {selectedSupplier.balance.toLocaleString()} ريال
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="العنوان">
                {selectedSupplier.address || 'لا يوجد'}
              </Descriptions.Item>
              <Descriptions.Item label="الشركة">
                {selectedSupplier.company || 'لا يوجد'}
              </Descriptions.Item>
              <Descriptions.Item label="إجمالي المشتريات">
                {selectedSupplier.totalSpent.toLocaleString()} ريال
              </Descriptions.Item>
            </Descriptions>

            {selectedSupplier.notes && (
              <>
                <Divider />
                <p><strong>ملاحظات:</strong></p>
                <p style={{ color: '#666', lineHeight: 1.6 }}>{selectedSupplier.notes}</p>
              </>
            )}

            <Divider />

            <h3 style={{ marginBottom: 16 }}>سجل المعاملات (المشتريات والدفعات)</h3>
            <Table
              columns={transactionColumns}
              dataSource={supplierTransactions}
              loading={transactionsLoading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default SuppliersPage
