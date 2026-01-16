'use client'

import { useState, useEffect, useMemo } from 'react'
import customersService from '../services/customersService'
import { useLanguage } from '../contexts/LanguageContext'
import { useBranch } from '../contexts/BranchContext'
import { getTranslations } from '../utils/translations'
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
  const { language } = useLanguage()
  const { branchCurrency } = useBranch()
  const t = getTranslations(language)
  
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
      
      // Filter to only customers (type = 'customer' or null for debugging)
      // Include null type temporarily for debugging, but prefer 'customer' type
      const customersData = (Array.isArray(data) ? data : [])
        .filter(c => c.type === 'customer' || c.type === null || c.type === undefined)
        .map(c => ({ ...c, key: c.id || c.key || `customer-${Date.now()}-${Math.random()}` }))
      
      setCustomers(customersData)
    } catch (error) {
      console.error('Error loading customers:', error)
      message.error(t.customers.failedToLoad)
      // Set empty array on error to prevent crashes
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  // Statistics
  const stats = useMemo(() => ({
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.status === 'active').length,
    corporateCustomers: customers.filter(c => c.type === 'corporate').length,
    totalBalance: customers.reduce((sum, c) => sum + (c.balance || 0), 0)
  }), [customers])

  // Table columns with Golden Template
  const columns = useMemo(() => [
    {
      title: t.customers.customer,
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
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
      title: t.customers.contactInfo,
      key: 'contact',
      render: (_: any, record: any) => (
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
      title: t.customers.type,
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'corporate' ? 'blue' : 'green'}>
          {type === 'corporate' ? t.customers.corporate : t.customers.individual}
        </Tag>
      )
    },
    {
      title: t.customers.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? t.customers.active : t.customers.inactive}
        </Tag>
      )
    },
    {
      title: t.customers.balance,
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: number) => (
        <span style={{ 
          fontWeight: 'bold', 
          color: balance >= 0 ? '#52c41a' : '#ff4d4f' 
        }}>
          {balance.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} {t.common.sar}
        </span>
      ),
      sorter: (a: any, b: any) => a.balance - b.balance
    },
    {
      title: t.customers.totalPurchases,
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      render: (total: number) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {total.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} {t.common.sar}
        </span>
      )
    },
    {
      title: t.common.actions,
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedCustomer(record)
              setViewModalVisible(true)
            }}
            title={t.customers.viewDetails}
          >
            {t.common.view}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title={t.common.edit}
          >
            {t.common.edit}
          </Button>
          <Popconfirm
            title={t.customers.deleteCustomer}
            description={t.customers.deleteCustomerConfirm}
            onConfirm={() => handleDelete(record.key || record.id)}
            okText={t.common.yes}
            cancelText={t.common.no}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              title={t.common.delete}
            >
              {t.common.delete}
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ], [t, language])

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return (Array.isArray(customers) ? customers : []).filter(customer => {
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
  }, [customers, searchText, statusFilter, typeFilter, activeTab])

  // Dynamic rowKey function
  const getRowKey = (record: any): string => {
    const timestamp = record.updatedAt || record.updated_at || record.lastUpdated || ''
    return `${record.id || record.key}-${timestamp}`
  }

  const handleDelete = async (key) => {
    try {
      const result = await customersService.deleteCustomer(key)
      if (result.success) {
        message.success(t.customers.customerDeleted)
        loadCustomers() // Refresh the list
      } else {
        message.error(result.error || t.customers.failedToDelete)
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      message.error(t.customers.failedToDelete)
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
        // Update existing customer
        const expectedVersion = selectedCustomer._version || null
        const result = await customersService.updateCustomer(selectedCustomer.id, values, expectedVersion)
        
        if (result.success) {
          message.success(t.customers.customerUpdated)
          setIsModalVisible(false)
          setSelectedCustomer(null)
          form.resetFields()
          loadCustomers() // Refresh the list
        } else {
          if (result.errorCode === 'VERSION_MISMATCH') {
            message.warning(result.error || t.customers.versionMismatch)
            loadCustomers() // Reload to get latest version
          } else {
            message.error(result.error || t.customers.failedToUpdate)
          }
        }
      } else {
        // Add new customer
        const result = await customersService.addCustomer(values)
        
        if (result.success) {
          message.success(t.customers.customerAdded)
          setIsModalVisible(false)
          setSelectedCustomer(null)
          form.resetFields()
          loadCustomers() // Refresh the list
        } else {
          message.error(result.error || t.customers.failedToAdd)
        }
      }
    } catch (error: any) {
      console.error('Validation failed:', error)
      if (error.errorFields) {
        message.error(t.customers.fillRequiredFields)
      } else {
        message.error(t.customers.errorSaving)
      }
    }
  }

  // Export data
  const handleExport = () => {
    const dataStr = JSON.stringify(customers, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = language === 'ar' ? 'العملاء.json' : 'customers.json'
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    message.success(t.customers.exportSuccess)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#333', margin: 0 }}>{t.customers.title}</h1>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>{t.customers.subtitle}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          {t.customers.addCustomer}
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.customers.totalCustomers}
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.customers.activeCustomers}
              value={stats.activeCustomers}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.customers.corporateCustomers}
              value={stats.corporateCustomers}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t.customers.totalBalance}
              value={stats.totalBalance}
              prefix={<DollarOutlined />}
              suffix={branchCurrency || 'SAR'}
            />
          </Card>
        </Col>
      </Row>

      {/* Search and Filter Tools */}
      <Card>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <Input
            placeholder={t.customers.searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            placeholder={t.customers.statusFilter}
          >
            <Option value="all">{t.customers.all}</Option>
            <Option value="active">{t.customers.active}</Option>
            <Option value="inactive">{t.customers.inactive}</Option>
          </Select>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 150 }}
            placeholder={t.customers.typeFilter}
          >
            <Option value="all">{t.customers.all}</Option>
            <Option value="individual">{t.customers.individual}</Option>
            <Option value="corporate">{t.customers.corporate}</Option>
          </Select>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            {t.customers.export}
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: t.customers.all },
            { key: 'active', label: t.customers.active },
            { key: 'inactive', label: t.customers.inactive }
          ]}
        />
      </Card>

      {/* Customers Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          loading={loading}
          pagination={{ pageSize: 10 }}
          rowKey={getRowKey}
        />
      </Card>

      {/* Add/Edit Customer Modal */}
      <Modal
        title={selectedCustomer ? t.customers.editCustomer : t.customers.newCustomer}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false)
          setSelectedCustomer(null)
          form.resetFields()
        }}
        okText={selectedCustomer ? t.common.update : t.common.add}
        cancelText={t.common.cancel}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t.customers.customerName}
                rules={[{ required: true, message: t.customers.customerNameRequired }]}
              >
                <Input placeholder={t.customers.customerName} prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label={t.customers.email}
                rules={[
                  { required: true, message: t.customers.emailRequired },
                  { type: 'email', message: t.customers.emailInvalid }
                ]}
              >
                <Input placeholder={t.customers.email} prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={t.customers.phone}
                validateTrigger={['onBlur', 'onSubmit']}
                rules={[
                  { required: true, message: t.customers.phoneRequired },
                  {
                    pattern: /^(\+?\d[\d\s-]{7,14})$/,
                    message: t.customers.phoneInvalid
                  }
                ]}
              >
                <Input placeholder={t.customers.phone} prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="company"
                label={t.customers.companyOptional}
              >
                <Input placeholder={t.customers.company} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label={t.customers.address}
          >
            <Input.TextArea
              rows={2}
              placeholder={t.customers.address}
            />
          </Form.Item>

          <Row gutter={16}>
            <Form.Item name="type" hidden initialValue="customer">
              <Input />
            </Form.Item>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t.customers.status}
                initialValue="active"
              >
                <Select>
                  <Option value="active">{t.customers.active}</Option>
                  <Option value="inactive">{t.customers.inactive}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label={t.customers.notesOptional}
          >
            <Input.TextArea rows={3} placeholder={t.customers.notesOptional} />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Customer Details Modal */}
      <Modal
        title={`${t.customers.viewDetails} - ${selectedCustomer?.name}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            {t.common.close}
          </Button>,
          <Button
            key="edit"
            type="primary"
            onClick={() => {
              setViewModalVisible(false)
              handleEdit(selectedCustomer)
            }}
          >
            {t.customers.edit}
          </Button>
        ]}
        width={700}
      >
        {selectedCustomer && (
          <div style={{ marginTop: 24 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label={t.customers.customer}>{selectedCustomer.id}</Descriptions.Item>
              <Descriptions.Item label={t.customers.registrationDate}>{selectedCustomer.registrationDate || t.customers.noData}</Descriptions.Item>
              <Descriptions.Item label={t.customers.customerName}>{selectedCustomer.name}</Descriptions.Item>
              <Descriptions.Item label={t.customers.email}>{selectedCustomer.email}</Descriptions.Item>
              <Descriptions.Item label={t.customers.phone}>{selectedCustomer.phone}</Descriptions.Item>
              <Descriptions.Item label={t.customers.type}>
                <Tag color={selectedCustomer.type === 'corporate' ? 'blue' : 'green'}>
                  {selectedCustomer.type === 'corporate' ? t.customers.corporate : t.customers.individual}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t.customers.status}>
                <Tag color={selectedCustomer.status === 'active' ? 'green' : 'red'}>
                  {selectedCustomer.status === 'active' ? t.customers.active : t.customers.inactive}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t.customers.balance}>
                <span style={{
                  fontWeight: 'bold',
                  color: selectedCustomer.balance >= 0 ? '#52c41a' : '#ff4d4f'
                }}>
                  {selectedCustomer.balance.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} {t.common.sar}
                </span>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label={t.customers.address}>
                {selectedCustomer.address || t.customers.noData}
              </Descriptions.Item>
              <Descriptions.Item label={t.customers.company}>
                {selectedCustomer.company || t.customers.noData}
              </Descriptions.Item>
              <Descriptions.Item label={t.customers.totalOrders}>
                {selectedCustomer.totalOrders || 0} {t.orders.order || 'orders'}
              </Descriptions.Item>
              <Descriptions.Item label={t.customers.totalPurchases}>
                {selectedCustomer.totalSpent.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')} {t.common.sar}
              </Descriptions.Item>
              <Descriptions.Item label={t.customers.lastPurchase}>
                {selectedCustomer.lastPurchase || t.customers.noData}
              </Descriptions.Item>
            </Descriptions>

            {selectedCustomer.notes && (
              <>
                <Divider />
                <p><strong>{t.customers.notes}:</strong></p>
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