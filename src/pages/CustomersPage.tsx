'use client'

import { useState, useEffect } from 'react'
import customersService from '../services/customersService'
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
  Divider,
  InputNumber,
  Upload
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
  UploadOutlined,
  ExportOutlined,
  ImportOutlined
} from '@ant-design/icons'

const { Option } = Select
// const { TabPane } = Tabs

const CustomersPage = () => {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState('all')

  // Load customers on mount
  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await customersService.loadCustomers()
      
      // Ensure data is an array before mapping
      if (Array.isArray(data) && data.length > 0) {
        setCustomers(data.map(c => ({ ...c, key: c.id || c.key || `customer-${Date.now()}-${Math.random()}` })))
      } else if (Array.isArray(data)) {
        // Empty array is valid
        setCustomers([])
      } else {
        console.warn('loadCustomers returned non-array data:', data)
        setCustomers([])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      message.error('فشل في تحميل بيانات العملاء')
      // Set empty array on error to prevent crashes
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  // إحصائيات
  const stats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.status === 'active').length,
    corporateCustomers: customers.filter(c => c.type === 'corporate').length,
    totalBalance: customers.reduce((sum, c) => sum + (c.balance || 0), 0)
  }

  // أعمدة الجدول
  const columns = [
    {
      title: 'العميل',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <Avatar 
            size="large" 
            style={{ backgroundColor: record.status === 'active' ? '#1890ff' : '#ff4d4f' }}
            icon={<UserOutlined />}
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
      title: 'النوع',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'corporate' ? 'blue' : 'green'}>
          {type === 'corporate' ? 'شركة' : 'فردي'}
        </Tag>
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
              setSelectedCustomer(record)
              setViewModalVisible(true)
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
            title="حذف العميل"
            description="هل أنت متأكد من حذف هذا العميل؟"
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

  // فلترة العملاء
  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(customer => {
    if (!customer) return false
    
    const matchesSearch =
      customer.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      customer.phone?.includes(searchText)
    
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
    const matchesType = typeFilter === 'all' || customer.type === typeFilter
    const matchesTab = activeTab === 'all' || customer.status === activeTab
    
    return matchesSearch && matchesStatus && matchesType && matchesTab
  })

  const handleDelete = async (key) => {
    try {
      const result = await customersService.deleteCustomer(key)
      if (result.success) {
        message.success('تم حذف العميل بنجاح')
        loadCustomers() // Refresh the list
      } else {
        message.error(result.error || 'فشل في حذف العميل')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      message.error('حدث خطأ أثناء حذف العميل')
    }
  }

  const handleEdit = (customer) => {
    setSelectedCustomer(customer)
    form.setFieldsValue({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      type: customer.type,
      status: customer.status,
      notes: customer.notes
    })
    setIsModalVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      
      if (selectedCustomer) {
        // تعديل عميل موجود
        const expectedVersion = selectedCustomer._version || null
        const result = await customersService.updateCustomer(selectedCustomer.id, values, expectedVersion)
        
        if (result.success) {
          message.success('تم تحديث بيانات العميل بنجاح')
          setIsModalVisible(false)
          setSelectedCustomer(null)
          form.resetFields()
          loadCustomers() // Refresh the list
        } else {
          if (result.errorCode === 'VERSION_MISMATCH') {
            message.warning(result.error)
            loadCustomers() // Reload to get latest version
          } else {
            message.error(result.error || 'فشل في تحديث بيانات العميل')
          }
        }
      } else {
        // إضافة عميل جديد
        const result = await customersService.addCustomer(values)
        
        if (result.success) {
          message.success('تم إضافة العميل بنجاح')
          setIsModalVisible(false)
          setSelectedCustomer(null)
          form.resetFields()
          loadCustomers() // Refresh the list
        } else {
          message.error(result.error || 'فشل في إضافة العميل')
        }
      }
    } catch (error) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error('يرجى ملء جميع الحقول المطلوبة بشكل صحيح')
      } else {
        message.error('حدث خطأ أثناء حفظ العميل')
      }
    }
  }

  // تصدير البيانات
  const handleExport = () => {
    const dataStr = JSON.stringify(customers, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = 'customers.json'
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    message.success('تم تصدير البيانات بنجاح')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>إدارة العملاء</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>إدارة قاعدة عملاء الشركة</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          إضافة عميل
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي العملاء"
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="العملاء النشطين"
              value={stats.activeCustomers}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="العملاء الشركات"
              value={stats.corporateCustomers}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="إجمالي الرصيد"
              value={stats.totalBalance}
              prefix={<DollarOutlined />}
              suffix="ريال"
            />
          </Card>
        </Col>
      </Row>

      {/* أدوات البحث والتصفية */}
      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Input
            placeholder="ابحث باسم العميل أو البريد أو الهاتف..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder="حالة العميل"
          >
            <Option value="all">الكل</Option>
            <Option value="active">نشط</Option>
            <Option value="inactive">غير نشط</Option>
          </Select>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 150 }}
            placeholder="نوع العميل"
          >
            <Option value="all">الكل</Option>
            <Option value="individual">فردي</Option>
            <Option value="corporate">شركة</Option>
          </Select>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
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

      {/* جدول العملاء */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey="key"
        />
      </Card>

      {/* Modal إضافة/تعديل عميل */}
      <Modal
        title={selectedCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedCustomer(null)
          form.resetFields()
        }}
        okText={selectedCustomer ? "تحديث" : "إضافة"}
        cancelText="إلغاء"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="اسم العميل"
                rules={[{ required: true, message: 'يرجى إدخال اسم العميل' }]}
              >
                <Input placeholder="أدخل اسم العميل" prefix={<UserOutlined />} />
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
                validateTrigger={['onBlur', 'onSubmit']}
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="نوع العميل"
                initialValue="individual"
              >
                <Select>
                  <Option value="individual">فردي</Option>
                  <Option value="corporate">شركة</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="ملاحظات (اختياري)"
          >
            <Input.TextArea rows={3} placeholder="ملاحظات إضافية عن العميل..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal عرض التفاصيل */}
      <Modal
        title={`تفاصيل العميل - ${selectedCustomer?.name}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            إغلاق
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setViewModalVisible(false)
              handleEdit(selectedCustomer)
            }}
          >
            تعديل البيانات
          </Button>
        ]}
        width={700}
      >
        {selectedCustomer && (
          <div style={{ marginTop: 24 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="رقم العميل">{selectedCustomer.id}</Descriptions.Item>
              <Descriptions.Item label="تاريخ التسجيل">{selectedCustomer.registrationDate}</Descriptions.Item>
              <Descriptions.Item label="الاسم">{selectedCustomer.name}</Descriptions.Item>
              <Descriptions.Item label="البريد الإلكتروني">{selectedCustomer.email}</Descriptions.Item>
              <Descriptions.Item label="الهاتف">{selectedCustomer.phone}</Descriptions.Item>
              <Descriptions.Item label="النوع">
                <Tag color={selectedCustomer.type === 'corporate' ? 'blue' : 'green'}>
                  {selectedCustomer.type === 'corporate' ? 'شركة' : 'فردي'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="الحالة">
                <Tag color={selectedCustomer.status === 'active' ? 'green' : 'red'}>
                  {selectedCustomer.status === 'active' ? 'نشط' : 'غير نشط'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="الرصيد">
                <span style={{
                  fontWeight: 'bold',
                  color: selectedCustomer.balance >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  {selectedCustomer.balance.toLocaleString()} ريال
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="العنوان">
                {selectedCustomer.address || 'لا يوجد'}
              </Descriptions.Item>
              <Descriptions.Item label="الشركة">
                {selectedCustomer.company || 'لا يوجد'}
              </Descriptions.Item>
              <Descriptions.Item label="إجمالي الطلبات">
                {selectedCustomer.totalOrders} طلب
              </Descriptions.Item>
              <Descriptions.Item label="إجمالي المشتريات">
                {selectedCustomer.totalSpent.toLocaleString()} ريال
              </Descriptions.Item>
              <Descriptions.Item label="آخر شراء">
                {selectedCustomer.lastPurchase || 'لا يوجد'}
              </Descriptions.Item>
            </Descriptions>

            {selectedCustomer.notes && (
              <>
                <Divider />
                <p><strong>ملاحظات:</strong></p>
                <p style={{ color: '#666', lineHeight: 1.6 }}>{selectedCustomer.notes}</p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CustomersPage