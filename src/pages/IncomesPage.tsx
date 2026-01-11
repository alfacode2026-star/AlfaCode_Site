'use client'

import { useState, useEffect } from 'react'
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
  DatePicker,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
  InputNumber,
  Alert,
  Statistic
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DollarOutlined
} from '@ant-design/icons'
import incomesService from '../services/incomesService'
import projectsService from '../services/projectsService'
import treasuryService from '../services/treasuryService'
import { useTenant } from '../contexts/TenantContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Title } = Typography

type IncomeType = 'down_payment' | 'milestone' | 'advance'

const IncomesPage = () => {
  const { industryType } = useTenant()
  const [incomes, setIncomes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingIncome, setEditingIncome] = useState<any>(null)
  const [form] = Form.useForm()
  const [projects, setProjects] = useState<any[]>([])
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [availableWorkScopes, setAvailableWorkScopes] = useState<string[]>([])

  const isEngineering = industryType === 'engineering'

  useEffect(() => {
    loadIncomes()
    if (isEngineering) {
      loadProjects()
    }
    loadTreasuryAccounts()
  }, [industryType])

  const loadIncomes = async () => {
    setLoading(true)
    try {
      const data = await incomesService.getIncomes()
      setIncomes(data || [])
    } catch (error) {
      console.error('Error loading incomes:', error)
      message.error('فشل في تحميل الواردات')
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const data = await projectsService.getProjects()
      setProjects(data || [])
      
      // Extract unique work scopes from all projects
      const scopes = new Set<string>()
      data.forEach((project: any) => {
        if (project.workScopes && Array.isArray(project.workScopes)) {
          project.workScopes.forEach((scope: string) => scopes.add(scope))
        }
      })
      setAvailableWorkScopes(Array.from(scopes))
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadTreasuryAccounts = async () => {
    try {
      const accounts = await treasuryService.getAccounts()
      setTreasuryAccounts(accounts || [])
    } catch (error) {
      console.error('Error loading treasury accounts:', error)
      setTreasuryAccounts([])
    }
  }

  const handleAdd = () => {
    setEditingIncome(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (income: any) => {
    setEditingIncome(income)
    form.setFieldsValue({
      projectId: income.projectId,
      date: income.date ? dayjs(income.date) : dayjs(),
      amount: income.amount,
      incomeType: income.incomeType === 'advance' ? 'advance' : 
                  income.incomeType === 'down_payment' ? 'down_payment' : 'milestone',
      treasuryAccountId: null, // Treasury account is not stored in payment, would need separate lookup
      description: income.description,
      referenceNumber: income.referenceNumber,
      workScope: income.workScope
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await incomesService.deleteIncome(id)
      if (result.success) {
        message.success('تم حذف الوارد بنجاح')
        loadIncomes()
        loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
      } else {
        message.error(result.error || 'فشل في حذف الوارد')
      }
    } catch (error) {
      console.error('Error deleting income:', error)
      message.error('فشل في حذف الوارد')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      const selectedProject = projects.find((p: any) => p.id === values.projectId)
      
      const incomeData = {
        projectId: values.projectId,
        projectName: selectedProject?.name || '',
        date: values.date ? values.date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        amount: values.amount,
        incomeType: values.incomeType || 'milestone',
        treasuryAccountId: values.treasuryAccountId,
        description: values.description,
        referenceNumber: values.referenceNumber,
        workScope: values.workScope || null
      }

      let result
      if (editingIncome) {
        result = await incomesService.updateIncome(editingIncome.id, incomeData)
      } else {
        result = await incomesService.createIncome(incomeData)
      }

      if (result.success) {
        message.success(editingIncome ? 'تم تحديث الوارد بنجاح' : 'تم إضافة الوارد بنجاح')
        setIsModalVisible(false)
        form.resetFields()
        loadIncomes()
        loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
      } else {
        message.error(result.error || 'فشل في حفظ الوارد')
      }
    } catch (error) {
      console.error('Error saving income:', error)
      message.error('فشل في حفظ الوارد')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getIncomeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      down_payment: 'عربون',
      milestone: 'مرحلة',
      advance: 'سلفة'
    }
    return labels[type] || type
  }

  const getIncomeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      down_payment: 'blue',
      milestone: 'green',
      advance: 'orange'
    }
    return colors[type] || 'default'
  }

  // Filter incomes based on search
  const filteredIncomes = incomes.filter(income => {
    if (!searchText) return true
    const searchLower = searchText.toLowerCase()
    return (
      income.projectName?.toLowerCase().includes(searchLower) ||
      income.description?.toLowerCase().includes(searchLower) ||
      income.paymentNumber?.toLowerCase().includes(searchLower) ||
      income.referenceNumber?.toLowerCase().includes(searchLower)
    )
  })

  const columns = [
    {
      title: 'اسم المشروع',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 200,
      render: (name: string) => name || 'غير محدد'
    },
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
      sorter: (a: any, b: any) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateA - dateB
      }
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
          {formatCurrency(amount || 0)}
        </span>
      ),
      align: 'right' as const,
      sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0)
    },
    {
      title: 'نوع الوارد',
      dataIndex: 'incomeType',
      key: 'incomeType',
      width: 120,
      render: (type: string) => (
        <Tag color={getIncomeTypeColor(type)}>
          {getIncomeTypeLabel(type)}
        </Tag>
      )
    },
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || '-'
    },
    {
      title: 'رقم المرجع',
      dataIndex: 'referenceNumber',
      key: 'referenceNumber',
      width: 120,
      render: (ref: string) => ref || '-'
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            تعديل
          </Button>
          <Popconfirm
            title="هل أنت متأكد من حذف هذا الوارد؟"
            onConfirm={() => handleDelete(record.id)}
            okText="نعم"
            cancelText="لا"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              حذف
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  // Calculate totals
  const totalAmount = filteredIncomes.reduce((sum, income) => sum + (income.amount || 0), 0)

  return (
    <div style={{ padding: '24px', direction: 'rtl' }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            <DollarOutlined style={{ marginLeft: 8, color: '#52c41a' }} />
            الواردات والسلف المستلمة
          </Title>
          <Space>
            <Input
              placeholder="بحث..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              size="large"
            >
              إضافة وارد/سلفة
            </Button>
          </Space>
        </div>

        {/* Summary Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="إجمالي الواردات"
                value={totalAmount}
                prefix="ريال"
                valueStyle={{ color: '#52c41a' }}
                formatter={(value) => formatCurrency(Number(value))}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="عدد السجلات"
                value={filteredIncomes.length}
                prefix="سجل"
              />
            </Card>
          </Col>
        </Row>

        {/* Incomes Table */}
        <Table
          columns={columns}
          dataSource={filteredIncomes.map(income => ({ ...income, key: income.id }))}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `إجمالي ${total} وارد`
          }}
          scroll={{ x: 'max-content' }}
          summary={() => {
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">
                    <strong style={{ fontSize: '16px' }}>الإجمالي:</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <strong style={{ color: '#52c41a', fontSize: '18px' }}>
                      {formatCurrency(totalAmount)}
                    </strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={3} />
                </Table.Summary.Row>
              </Table.Summary>
            )
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingIncome ? 'تعديل وارد/سلفة' : 'إضافة وارد/سلفة جديد'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
          setEditingIncome(null)
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
        >
          {/* Project Selection */}
          <Form.Item
            name="projectId"
            label="المشروع"
            rules={[{ required: true, message: 'يرجى اختيار المشروع' }]}
          >
            <Select
              placeholder="اختر المشروع"
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {projects.map((project: any) => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Work Scope (Optional) */}
          {availableWorkScopes.length > 0 && (
            <Form.Item
              name="workScope"
              label="نطاق العمل (اختياري)"
            >
              <Select
                placeholder="اختر نطاق العمل"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {availableWorkScopes.map(scope => (
                  <Option key={scope} value={scope}>
                    {scope}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="التاريخ"
                rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="المبلغ (ريال)"
                rules={[{ required: true, message: 'يرجى إدخال المبلغ' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="incomeType"
                label="نوع الوارد"
                rules={[{ required: true, message: 'يرجى اختيار نوع الوارد' }]}
                initialValue="milestone"
              >
                <Select placeholder="اختر نوع الوارد">
                  <Option value="down_payment">عربون</Option>
                  <Option value="milestone">مرحلة</Option>
                  <Option value="advance">سلفة</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="referenceNumber"
                label="رقم المرجع (اختياري)"
              >
                <Input placeholder="رقم المرجع أو رقم الإيصال" />
              </Form.Item>
            </Col>
          </Row>

          {/* Treasury Account Selection */}
          {treasuryAccounts.length === 0 && (
            <Alert
              type="error"
              message="تنبيه: لا يوجد حسابات خزينة معرفة. يرجى إنشاء حساب في صفحة الخزينة أولاً"
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          <Form.Item
            name="treasuryAccountId"
            label="حساب الخزينة"
            rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة' }]}
            tooltip="اختر الحساب الذي سيتم إيداع المبلغ فيه"
          >
            <Select
              placeholder="اختر حساب الخزينة"
              disabled={treasuryAccounts.length === 0}
              notFoundContent={treasuryAccounts.length === 0 ? "لا توجد حسابات خزينة" : null}
            >
              {treasuryAccounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Description */}
          <Form.Item
            name="description"
            label="الوصف"
            rules={[{ required: true, message: 'يرجى إدخال الوصف' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="وصف الوارد/السلفة"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default IncomesPage
