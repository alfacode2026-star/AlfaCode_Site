'use client'

import { useState, useEffect } from 'react'
import moment from 'moment'
import treasuryService from '../services/treasuryService'
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
  Popconfirm,
  message,
  InputNumber,
  Typography,
  Divider,
  Statistic,
  Badge
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  WalletOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined
} from '@ant-design/icons'

const { Option } = Select
const { Title } = Typography

const TreasuryPage = () => {
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [accountForm] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [selectedAccountFilter, setSelectedAccountFilter] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadAccounts(), loadTransactions()])
    } catch (error) {
      console.error('Error loading data:', error)
      message.error('فشل في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const data = await treasuryService.getAccounts()
      setAccounts(data || [])
    } catch (error) {
      console.error('Error loading accounts:', error)
      message.error('فشل في تحميل بيانات الحسابات')
    }
  }

  const loadTransactions = async (accountId = null) => {
    setTransactionsLoading(true)
    try {
      const data = await treasuryService.getTransactions(accountId)
      setTransactions(data || [])
    } catch (error) {
      console.error('Error loading transactions:', error)
      message.error('فشل في تحميل بيانات المعاملات')
    } finally {
      setTransactionsLoading(false)
    }
  }

  // Calculate balances dynamically from latest accounts state
  // Cash accounts (cash_box type)
  const totalCash = accounts
    .filter(acc => acc.type === 'cash_box')
    .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0)
  
  // Bank accounts (bank type)
  const totalBank = accounts
    .filter(acc => acc.type === 'bank')
    .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0)
  
  // Grand Total: Sum of ALL account types (includes any future account types)
  const grandTotal = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0)

  // Handle account operations
  const handleAddAccount = () => {
    setSelectedAccount(null)
    accountForm.resetFields()
    accountForm.setFieldsValue({ type: 'bank' })
    setIsAccountModalVisible(true)
  }

  const handleEditAccount = (account) => {
    setSelectedAccount(account)
    accountForm.setFieldsValue({
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance
    })
    setIsAccountModalVisible(true)
  }

  const handleSaveAccount = async (values) => {
    try {
      const accountData = {
        name: values.name,
        type: values.type,
        initialBalance: values.initialBalance || 0
      }

      let result
      if (selectedAccount) {
        // For update, only update name and type (balance is calculated from transactions)
        result = await treasuryService.updateAccount(selectedAccount.id, {
          name: accountData.name,
          type: accountData.type
        })
      } else {
        result = await treasuryService.addAccount(accountData)
      }

      if (result.success) {
        message.success(selectedAccount ? 'تم تحديث الحساب بنجاح' : 'تم إضافة الحساب بنجاح')
        setIsAccountModalVisible(false)
        accountForm.resetFields()
        setSelectedAccount(null)
        await loadAccounts()
      } else {
        message.error(result.error || 'فشل في حفظ الحساب')
      }
    } catch (error) {
      console.error('Error saving account:', error)
      message.error('حدث خطأ أثناء حفظ الحساب')
    }
  }

  const handleDeleteAccount = async (id) => {
    try {
      const result = await treasuryService.deleteAccount(id)
      if (result.success) {
        message.success('تم حذف الحساب بنجاح')
        await loadAccounts()
        if (selectedAccountFilter === id) {
          setSelectedAccountFilter(null)
          loadTransactions()
        }
      } else {
        message.error(result.error || 'فشل في حذف الحساب')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      message.error('حدث خطأ أثناء حذف الحساب')
    }
  }

  // Handle account filter change
  const handleAccountFilterChange = (accountId) => {
    setSelectedAccountFilter(accountId)
    loadTransactions(accountId || null)
  }

  // Account columns
  const accountColumns = [
    {
      title: 'اسم الحساب',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {record.type === 'bank' ? <BankOutlined /> : <WalletOutlined />}
          <span style={{ fontWeight: 500 }}>{name}</span>
        </div>
      )
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'bank' ? 'blue' : 'green'}>
          {type === 'bank' ? 'بنك' : 'صندوق نقدي'}
        </Tag>
      )
    },
    {
      title: 'الرصيد الحالي',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      render: (balance) => (
        <span style={{ fontWeight: 'bold', color: balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {balance.toLocaleString()} ريال
        </span>
      ),
      sorter: (a, b) => (a.currentBalance || 0) - (b.currentBalance || 0)
    },
    {
      title: 'الرصيد الأولي',
      dataIndex: 'initialBalance',
      key: 'initialBalance',
      render: (balance) => <span>{balance.toLocaleString()} ريال</span>
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAccount(record)}
            title="تعديل"
          />
          <Popconfirm
            title="حذف الحساب"
            description="هل أنت متأكد من حذف هذا الحساب؟"
            onConfirm={() => handleDeleteAccount(record.id)}
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

  // Transaction columns
  const transactionColumns = [
    {
      title: 'التاريخ',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => {
        if (!date) return 'غير محدد'
        const parsed = moment(date)
        return parsed.isValid() ? parsed.format('DD-MMM-YYYY HH:mm') : '-'
      },
      sorter: (a, b) => {
        const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateA - dateB
      },
      defaultSortOrder: 'descend'
    },
    {
      title: 'الحساب',
      dataIndex: 'accountId',
      key: 'accountId',
      render: (accountId) => {
        const account = accounts.find(acc => acc.id === accountId)
        return account ? account.name : 'غير محدد'
      }
    },
    {
      title: 'النوع',
      dataIndex: 'transactionType',
      key: 'transactionType',
      render: (type) => (
        <Tag color={type === 'inflow' ? 'green' : 'red'} icon={type === 'inflow' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
          {type === 'inflow' ? 'إيداع' : 'سحب'}
        </Tag>
      )
    },
    {
      title: 'اسم المشروع',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (projectName) => {
        if (projectName) {
          return <Tag color="purple">{projectName}</Tag>
        }
        return '-'
      }
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => (
        <span style={{ fontWeight: 'bold', color: record.transactionType === 'inflow' ? '#52c41a' : '#ff4d4f' }}>
          {record.transactionType === 'inflow' ? '+' : '-'}{amount.toLocaleString()} ريال
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0)
    },
    {
      title: 'المرجع',
      key: 'reference',
      render: (_, record) => {
        if (record.referenceType && record.referenceId) {
          const typeLabels = {
            payment: 'دفعة',
            expense: 'مصروف',
            order: 'أمر شراء'
          }
          return (
            <Tag color="blue">
              {typeLabels[record.referenceType] || record.referenceType}: {record.referenceId.substring(0, 8)}
            </Tag>
          )
        }
        return '-'
      }
    },
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      render: (description) => description || '-'
    }
  ]

  // Filter transactions by search
  const filteredTransactions = transactions.filter(txn => {
    const account = accounts.find(acc => acc.id === txn.accountId)
    const accountName = account ? account.name.toLowerCase() : ''
    const description = (txn.description || '').toLowerCase()
    const referenceId = (txn.referenceId || '').toLowerCase()
    
    return (
      accountName.includes(searchText.toLowerCase()) ||
      description.includes(searchText.toLowerCase()) ||
      referenceId.includes(searchText.toLowerCase())
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>إدارة الخزينة</Title>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>عرض وإدارة حسابات الخزينة والمعاملات المالية</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
          إضافة حساب
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="إجمالي النقد (صندوق نقدي)"
              value={totalCash}
              precision={0}
              prefix={<WalletOutlined />}
              suffix="ريال"
              styles={{ content: { color: totalCash >= 0 ? '#52c41a' : '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="إجمالي البنك"
              value={totalBank}
              precision={0}
              prefix={<BankOutlined />}
              suffix="ريال"
              styles={{ content: { color: totalBank >= 0 ? '#1890ff' : '#ff4d4f' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="الإجمالي العام"
              value={grandTotal}
              precision={0}
              prefix={<DollarOutlined />}
              suffix="ريال"
              styles={{ content: { color: grandTotal >= 0 ? '#722ed1' : '#ff4d4f' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Accounts Table */}
      <Card title="حسابات الخزينة" extra={<Badge count={accounts.length} />}>
        <Table
          columns={accountColumns}
          dataSource={accounts}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Transactions Section */}
      <Card
        title="سجل المعاملات"
        extra={
          <Space>
            <Select
              placeholder="فلترة حسب الحساب"
              allowClear
              style={{ width: 200 }}
              value={selectedAccountFilter}
              onChange={handleAccountFilterChange}
            >
              {accounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="ابحث في المعاملات..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
          </Space>
        }
      >
        <Table
          columns={transactionColumns}
          dataSource={filteredTransactions}
          loading={transactionsLoading}
          rowKey="id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* Add/Edit Account Modal */}
      <Modal
        title={selectedAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}
        open={isAccountModalVisible}
        onOk={() => accountForm.submit()}
        onCancel={() => {
          setIsAccountModalVisible(false)
          accountForm.resetFields()
          setSelectedAccount(null)
        }}
        okText="حفظ"
        cancelText="إلغاء"
      >
        <Form
          form={accountForm}
          layout="vertical"
          onFinish={handleSaveAccount}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="name"
            label="اسم الحساب"
            rules={[{ required: true, message: 'يرجى إدخال اسم الحساب' }]}
          >
            <Input placeholder="مثال: البنك الأهلي، الصندوق النقدي الرئيسي" />
          </Form.Item>

          <Form.Item
            name="type"
            label="نوع الحساب"
            rules={[{ required: true, message: 'يرجى اختيار نوع الحساب' }]}
          >
            <Select>
              <Option value="bank">بنك</Option>
              <Option value="cash_box">صندوق نقدي</Option>
            </Select>
          </Form.Item>

          {!selectedAccount && (
            <Form.Item
              name="initialBalance"
              label="الرصيد الأولي"
              rules={[{ required: true, message: 'يرجى إدخال الرصيد الأولي' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                min={0}
              />
            </Form.Item>
          )}

          {selectedAccount && (
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: 4, marginBottom: 16 }}>
              <div><strong>الرصيد الحالي:</strong> {selectedAccount.currentBalance.toLocaleString()} ريال</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                لا يمكن تعديل الرصيد - يتم تحديثه تلقائياً من المعاملات
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default TreasuryPage
