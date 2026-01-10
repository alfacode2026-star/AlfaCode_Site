'use client'

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import projectsService from '../services/projectsService'
import ordersService from '../services/ordersService'
import contractsService from '../services/contractsService'
import paymentsService from '../services/paymentsService'
import {
  Card,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Spin,
  Empty,
  message,
  Divider,
  Typography,
  Form,
  Modal,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Tabs
} from 'antd'
import {
  ArrowLeftOutlined,
  DollarOutlined,
  ShoppingOutlined,
  WalletOutlined,
  RocketOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  PlusOutlined,
  InboxOutlined
} from '@ant-design/icons'
import moment from 'moment'

const { Title } = Typography
const { Option } = Select
const { TabPane } = Tabs
const { TextArea } = Input

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  
  const [project, setProject] = useState(null)
  const [orders, setOrders] = useState([])
  const [contracts, setContracts] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)

  useEffect(() => {
    if (id) {
      loadProjectDetails()
    }
  }, [id])

  const loadProjectDetails = async () => {
    setLoading(true)
    try {
      // Load project details
      const projectData = await projectsService.getProjectById(id)
      if (!projectData) {
        message.error('المشروع غير موجود')
        navigate('/projects')
        return
      }
      setProject(projectData)

      // Load all related data
      const [projectOrders, projectContracts, projectPayments] = await Promise.all([
        ordersService.getOrdersByProject(id),
        contractsService.getContractsByProject(id),
        paymentsService.getPaymentsByProject(id)
      ])

      setOrders(projectOrders || [])
      setContracts(projectContracts || [])
      setPayments(projectPayments || [])
    } catch (error) {
      console.error('Error loading project details:', error)
      message.error('فشل في تحميل بيانات المشروع')
    } finally {
      setLoading(false)
    }
  }

  // Calculate Total Budget: Sum of main contract + all related addendums
  const calculateTotalBudget = () => {
    if (!contracts || contracts.length === 0) {
      // Fallback to project budget if no contracts
      return parseFloat(project?.budget) || 0
    }

    // Sum all contracts (original + amendments) for this project
    const totalBudget = contracts.reduce((sum, contract) => {
      return sum + (parseFloat(contract.totalAmount) || 0)
    }, 0)

    return totalBudget
  }

  // Calculate Total Expenses: Sum of all Orders + Expense Payments linked to this project (including labor costs)
  const calculateTotalExpenses = () => {
    const ordersTotal = orders.reduce((sum, order) => {
      return sum + (parseFloat(order.total) || 0)
    }, 0)

    const expensePaymentsTotal = payments.reduce((sum, payment) => {
      // Only count expense payments (supplier payments) that are paid
      // Exclude general expenses (those without project_id or with isGeneralExpense flag)
      // Include labor expenses (expenseCategory = 'Labor/أجور عمال') if they have project_id
      // If paymentType is undefined and no contractId, treat as expense (backward compatibility)
      const isExpense = payment.paymentType === 'expense' || (payment.paymentType === undefined && !payment.contractId)
      // General expenses are those without project_id but with expenseCategory
      // Labor expenses have both project_id and expenseCategory, so they're NOT general expenses
      const isGeneralExpense = payment.isGeneralExpense || (!payment.projectId && payment.expenseCategory)
      
      if (isExpense && !isGeneralExpense && payment.status === 'paid') {
        return sum + (parseFloat(payment.amount) || 0)
      }
      return sum
    }, 0)

    return ordersTotal + expensePaymentsTotal
  }

  // Calculate Total Collected (Income): Sum of all Income Payments (client payments)
  const calculateTotalCollected = () => {
    return payments.reduce((sum, payment) => {
      // Only count income payments (client payments) that are paid
      // If paymentType is undefined but contractId exists, treat as income (backward compatibility)
      const isIncome = payment.paymentType === 'income' || (payment.paymentType === undefined && payment.contractId)
      if (isIncome && payment.status === 'paid') {
        return sum + (parseFloat(payment.amount) || 0)
      }
      return sum
    }, 0)
  }

  // Calculate financial metrics
  const calculateFinancials = () => {
    if (!project) {
      return { 
        totalBudget: 0, 
        totalExpenses: 0,
        totalCollected: 0,
        cashFlow: 0,
        netMargin: 0,
        profitMargin: 0,
        remainingBudget: 0,
        budgetUsagePercent: 0,
        invoicedPercent: 0
      }
    }

    const totalBudget = calculateTotalBudget()
    const totalExpenses = calculateTotalExpenses()
    const totalCollected = calculateTotalCollected()
    
    // Cash Flow = Total Collected - Total Expenses (money in vs money out)
    const cashFlow = totalCollected - totalExpenses
    
    // Net Margin = Total Budget - Total Expenses (planned vs actual)
    const netMargin = totalBudget - totalExpenses
    
    // Profit Margin = (Net Margin / Total Budget) * 100
    const profitMargin = totalBudget > 0 ? (netMargin / totalBudget) * 100 : 0
    
    const remainingBudget = Math.max(0, totalBudget - totalExpenses)
    const budgetUsagePercent = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0
    
    // Invoiced Percentage = (Total Collected / Total Budget) * 100
    const invoicedPercent = totalBudget > 0 ? (totalCollected / totalBudget) * 100 : 0

    return { 
      totalBudget, 
      totalExpenses,
      totalCollected,
      cashFlow,
      netMargin,
      profitMargin,
      remainingBudget, 
      budgetUsagePercent,
      invoicedPercent
    }
  }

  const { 
    totalBudget, 
    totalExpenses,
    totalCollected,
    cashFlow,
    netMargin,
    profitMargin,
    remainingBudget, 
    budgetUsagePercent,
    invoicedPercent
  } = calculateFinancials()

  // Calculate scope spending breakdown
  const calculateScopeSpending = () => {
    if (!project?.workScopes || !Array.isArray(project.workScopes) || project.workScopes.length === 0) {
      return []
    }

    // Group orders and payments by work scope
    const scopeBreakdown = project.workScopes.map(scope => {
      // Calculate spent from orders for this scope
      const ordersForScope = orders.filter(order => order.workScope === scope)
      const ordersSpent = ordersForScope.reduce((sum, order) => {
        return sum + (parseFloat(order.total) || 0)
      }, 0)

      // Calculate spent from payments for this scope
      const paymentsForScope = payments.filter(payment => payment.workScope === scope && payment.status === 'paid')
      const paymentsSpent = paymentsForScope.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amount) || 0)
      }, 0)

      const totalSpent = ordersSpent + paymentsSpent

      // Try to get allocated budget from contracts for this scope
      // For now, we'll distribute budget equally across scopes if not specified
      // In a more advanced implementation, contracts could have scope-level budgets
      const scopeAllocated = totalBudget > 0 ? totalBudget / project.workScopes.length : 0
      const usagePercent = scopeAllocated > 0 ? (totalSpent / scopeAllocated) * 100 : 0

      return {
        scope,
        allocated: scopeAllocated,
        spent: totalSpent,
        usagePercent: Math.min(100, usagePercent),
        ordersCount: ordersForScope.length,
        paymentsCount: paymentsForScope.length
      }
    })

    return scopeBreakdown
  }

  const scopeBreakdown = calculateScopeSpending()

  // Get progress bar color based on usage
  const getProgressColor = (percent: number) => {
    if (percent < 70) return '#52c41a' // Green
    if (percent < 90) return '#faad14' // Yellow
    return '#ff4d4f' // Red
  }

  // Get status tag color
  const getStatusConfig = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      active: { color: 'green', text: 'نشط' },
      on_hold: { color: 'orange', text: 'متوقف' },
      completed: { color: 'blue', text: 'مكتمل' },
      cancelled: { color: 'red', text: 'ملغي' },
    }
    return statusConfig[status] || { color: 'default', text: 'غير محدد' }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Prepare unified ledger data (Orders + Payments)
  const prepareUnifiedLedger = () => {
    const ledger: any[] = []

    // Add orders to ledger (expenses)
    orders.forEach(order => {
      ledger.push({
        key: `order-${order.id}`,
        id: order.id,
        type: 'order',
        paymentType: 'expense',
        typeLabel: 'أمر شراء',
        date: order.createdAt,
        description: `أمر شراء ${order.workScope ? `- ${order.workScope}` : ''}`,
        customer: order.customerName || 'غير محدد',
        amount: parseFloat(order.total) || 0,
        status: order.status,
        reference: `PO-${order.id}`,
        workScope: order.workScope || null
      })
    })

    // Add payments to ledger (income or expense based on paymentType)
    // Exclude general expenses from project ledger
    payments.forEach(payment => {
      // Skip general expenses (those without project_id or with isGeneralExpense flag)
      const isGeneralExpense = payment.isGeneralExpense || (!payment.projectId && payment.expenseCategory)
      if (isGeneralExpense) {
        return // Skip general expenses in project ledger
      }

      // Determine if income: explicit type or has contractId (backward compatibility)
      const isIncome = payment.paymentType === 'income' || (payment.paymentType === undefined && payment.contractId)
      const paymentType = payment.paymentType || (payment.contractId ? 'income' : 'expense')
      ledger.push({
        key: `payment-${payment.id}`,
        id: payment.id,
        type: 'payment',
        paymentType: paymentType,
        typeLabel: isIncome ? 'مستخلص (محصل)' : 'دفعة (مصروف)',
        date: payment.paidDate || payment.dueDate,
        description: `${isIncome ? 'مستخلص' : 'دفعة'} ${payment.paymentNumber}${payment.workScope ? ` - ${payment.workScope}` : ''}`,
        customer: isIncome ? 'العميل' : 'المورد',
        amount: parseFloat(payment.amount) || 0,
        status: payment.status,
        reference: payment.paymentNumber,
        workScope: payment.workScope || null
      })
    })

    // Sort by date (newest first)
    return ledger.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })
  }

  const unifiedLedger = prepareUnifiedLedger()

  // Handle invoice/milestone creation
  const handleCreateInvoice = async (values: any) => {
    try {
      // Find the first contract for this project to link the payment
      const projectContract = contracts.length > 0 ? contracts[0] : null
      
      if (!projectContract) {
        message.error('لا يوجد عقد مرتبط بهذا المشروع. يرجى إنشاء عقد أولاً')
        return
      }

      const paymentData = {
        contractId: projectContract.id,
        projectId: id,
        workScope: values.workScope || null,
        paymentType: 'income', // Income payment from client
        amount: values.amount,
        dueDate: values.dueDate ? moment(values.dueDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        paidDate: values.status === 'paid' ? (values.paidDate ? moment(values.paidDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')) : null,
        status: values.status || 'pending',
        notes: values.description || null,
        paymentMethod: values.paymentMethod || null,
        referenceNumber: values.referenceNumber || null,
      }

      const result = await paymentsService.createPayment(paymentData)
      
      if (result.success) {
        message.success('تم إنشاء المستخلص بنجاح')
        setInvoiceModalVisible(false)
        form.resetFields()
        await loadProjectDetails() // Reload data
      } else {
        message.error(result.error || 'فشل في إنشاء المستخلص')
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
      message.error('حدث خطأ أثناء إنشاء المستخلص')
    }
  }

  // Get available work scopes from project
  const availableWorkScopes = project?.workScopes || []

  // Table columns for unified ledger
  const ledgerColumns = [
    {
      title: 'التاريخ',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => moment(date).format('YYYY-MM-DD'),
      sorter: (a: any, b: any) => moment(a.date).unix() - moment(b.date).unix(),
      width: 120,
    },
    {
      title: 'النوع',
      dataIndex: 'typeLabel',
      key: 'type',
                  render: (typeLabel: string, record: any) => {
        const isIncome = record.paymentType === 'income'
        const color = isIncome ? 'green' : record.type === 'order' ? 'red' : 'orange'
        return (
          <Tag color={color}>
            {typeLabel}
            {record.isGeneralExpense && (
              <span style={{ marginRight: 4, fontSize: '10px' }}> / مصروف عام</span>
            )}
          </Tag>
        )
      },
      width: 120,
    },
    {
      title: 'الوصف',
      dataIndex: 'description',
      key: 'description',
      render: (description: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{description}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.reference}</div>
        </div>
      ),
    },
    {
      title: 'نطاق العمل',
      dataIndex: 'workScope',
      key: 'workScope',
      render: (workScope: string) => workScope ? (
        <Tag color="cyan">{workScope}</Tag>
      ) : (
        <span style={{ color: '#999' }}>-</span>
      ),
      width: 120,
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: 'قيد الانتظار' },
          processing: { color: 'blue', text: 'قيد المعالجة' },
          shipped: { color: 'cyan', text: 'تم الشحن' },
          completed: { color: 'green', text: 'مكتمل' },
          paid: { color: 'green', text: 'مدفوع' },
          cancelled: { color: 'red', text: 'ملغي' },
        }
        const config = statusConfig[status] || { color: 'default', text: status || 'غير محدد' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
      width: 120,
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) => {
        const isIncome = record.paymentType === 'income'
        const color = isIncome ? '#52c41a' : '#ff4d4f' // Green for income, Red for expense
        return (
          <span style={{ fontWeight: 'bold', color: color, fontSize: '16px' }}>
            {isIncome ? '+' : '-'}{formatCurrency(amount || 0)}
          </span>
        )
      },
      sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0),
      align: 'right' as const,
      width: 150,
    },
  ]

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" tip="جاري التحميل..." />
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="المشروع غير موجود" />
      </div>
    )
  }

  const statusConfig = getStatusConfig(project.status)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24 }}>
      {/* Back Button */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/projects')}
        style={{ alignSelf: 'flex-start' }}
      >
        العودة إلى المشاريع
      </Button>

      {/* Header Card */}
      <Card 
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <RocketOutlined style={{ fontSize: 32, color: 'white' }} />
                <h1 style={{ fontSize: 28, fontWeight: 'bold', color: 'white', margin: 0 }}>
                  {project.name}
                </h1>
                <Tag color={statusConfig.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                  {statusConfig.text}
                </Tag>
              </div>
              
              <Space size="large" style={{ marginTop: 16, flexWrap: 'wrap' }}>
                {project.client && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserOutlined style={{ color: 'white' }} />
                    <span style={{ color: 'white', fontSize: '16px' }}>
                      <strong>العميل:</strong> {project.client.name}
                    </span>
                  </div>
                )}
                {project.startDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined style={{ color: 'white' }} />
                    <span style={{ color: 'white', fontSize: '16px' }}>
                      <strong>تاريخ البدء:</strong> {moment(project.startDate).format('YYYY-MM-DD')}
                    </span>
                  </div>
                )}
                {project.endDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined style={{ color: 'white' }} />
                    <span style={{ color: 'white', fontSize: '16px' }}>
                      <strong>تاريخ الانتهاء:</strong> {moment(project.endDate).format('YYYY-MM-DD')}
                    </span>
                  </div>
                )}
              </Space>

              {project.notes && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <FileTextOutlined style={{ color: 'white' }} />
                    <strong style={{ color: 'white' }}>ملاحظات:</strong>
                  </div>
                  <p style={{ margin: 0, color: 'white' }}>{project.notes}</p>
                </div>
              )}
            </div>
          </div>
        </Space>
      </Card>

      {/* Financial Statistics - 4 Large Cards with Gradients */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              height: '100%'
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '16px' }}>الميزانية الإجمالية</span>}
              value={totalBudget}
              prefix={<WalletOutlined style={{ color: 'white' }} />}
              suffix={<span style={{ color: 'white' }}>ريال</span>}
              valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              {contracts.length > 0 ? (
                <div>العقد الأساسي + {contracts.filter(c => c.contractType === 'amendment').length} ملحق</div>
              ) : (
                <div>من ميزانية المشروع</div>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
              border: 'none',
              height: '100%'
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '16px' }}>إجمالي المحصل</span>}
              value={totalCollected}
              prefix={<InboxOutlined style={{ color: 'white' }} />}
              suffix={<span style={{ color: 'white' }}>ريال</span>}
              valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>{payments.filter(p => (p.paymentType === 'income' || (p.paymentType === undefined && p.contractId)) && p.status === 'paid').length} مستخلص مدفوع</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              height: '100%'
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '16px' }}>إجمالي المصروف</span>}
              value={totalExpenses}
              prefix={<ShoppingOutlined style={{ color: 'white' }} />}
              suffix={<span style={{ color: 'white' }}>ريال</span>}
              valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>{orders.length} أمر شراء + {payments.filter(p => (p.paymentType === 'expense' || (p.paymentType === undefined && !p.contractId)) && p.status === 'paid').length} دفعة مصروف</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            style={{
              background: cashFlow >= 0 
                ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              border: 'none',
              height: '100%'
            }}
            bodyStyle={{ padding: 24 }}
          >
            <Statistic
              title={<span style={{ color: 'white', fontSize: '16px' }}>التدفق النقدي</span>}
              value={cashFlow}
              prefix={cashFlow >= 0 ? <RiseOutlined style={{ color: 'white' }} /> : <RiseOutlined style={{ color: 'white', transform: 'rotate(180deg)' }} />}
              suffix={<span style={{ color: 'white' }}>ريال</span>}
              valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>الهامش: {profitMargin.toFixed(2)}%</div>
              <div>صافي الهامش: {formatCurrency(netMargin)}</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Budget Usage Progress */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Title level={4} style={{ margin: 0 }}>استخدام الميزانية</Title>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: getProgressColor(budgetUsagePercent) }}>
                  {budgetUsagePercent.toFixed(1)}%
                </span>
              </div>
              <Progress
                percent={Math.min(100, budgetUsagePercent)}
                strokeColor={getProgressColor(budgetUsagePercent)}
                trailColor="#f0f0f0"
                strokeWidth={20}
                format={() => `${formatCurrency(totalExpenses)} من ${formatCurrency(totalBudget)}`}
                status={budgetUsagePercent >= 100 ? 'exception' : budgetUsagePercent >= 90 ? 'active' : 'success'}
              />
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#fafafa',
              borderRadius: 4
            }}>
              <span style={{ color: '#666' }}>
                <strong>المستخدم:</strong> {formatCurrency(totalExpenses)}
              </span>
              <span style={{ color: '#666' }}>
                <strong>المتاح:</strong> {formatCurrency(remainingBudget)}
              </span>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Title level={4} style={{ margin: 0 }}>المستخلصات المحصلة</Title>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  {invoicedPercent.toFixed(1)}%
                </span>
              </div>
              <Progress
                percent={Math.min(100, invoicedPercent)}
                strokeColor="#52c41a"
                trailColor="#f0f0f0"
                strokeWidth={20}
                format={() => `${formatCurrency(totalCollected)} من ${formatCurrency(totalBudget)}`}
                status={invoicedPercent >= 100 ? 'success' : invoicedPercent >= 70 ? 'active' : 'normal'}
              />
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#f6ffed',
              borderRadius: 4
            }}>
              <span style={{ color: '#666' }}>
                <strong>المحصل:</strong> {formatCurrency(totalCollected)}
              </span>
              <span style={{ color: '#666' }}>
                <strong>المتبقي:</strong> {formatCurrency(Math.max(0, totalBudget - totalCollected))}
              </span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Scope Spending Breakdown */}
      {scopeBreakdown.length > 0 && (
        <Card title={<Title level={4} style={{ margin: 0 }}>توزيع الإنفاق حسب نطاق العمل</Title>}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {scopeBreakdown.map((scope) => (
              <div key={scope.scope}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px', marginBottom: 8 }}>
                      {scope.scope}
                    </Tag>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                      {scope.ordersCount} أمر شراء • {scope.paymentsCount} دفعة
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                      {formatCurrency(scope.spent)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      من {formatCurrency(scope.allocated)}
                    </div>
                  </div>
                </div>
                <Progress
                  percent={scope.usagePercent}
                  strokeColor={getProgressColor(scope.usagePercent)}
                  trailColor="#f0f0f0"
                  strokeWidth={12}
                  showInfo={true}
                  format={(percent) => `${percent?.toFixed(1)}%`}
                  status={scope.usagePercent >= 100 ? 'exception' : scope.usagePercent >= 90 ? 'active' : 'success'}
                />
              </div>
            ))}
          </Space>
        </Card>
      )}

      {/* Invoicing & Collection Section */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InboxOutlined />
              <Title level={4} style={{ margin: 0 }}>المستخلصات والتحصيل</Title>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setInvoiceModalVisible(true)}
            >
              إضافة مستخلص/مرحلة
            </Button>
          </div>
        }
      >
        <Table
          columns={[
            {
              title: 'رقم المستخلص',
              dataIndex: 'paymentNumber',
              key: 'paymentNumber',
              width: 150,
            },
            {
              title: 'الوصف/المرحلة',
              dataIndex: 'notes',
              key: 'notes',
              render: (notes: string, record: any) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{notes || 'مستخلص'}</div>
                  {record.workScope && (
                    <Tag color="cyan" style={{ marginTop: 4 }}>{record.workScope}</Tag>
                  )}
                </div>
              ),
            },
            {
              title: 'المبلغ',
              dataIndex: 'amount',
              key: 'amount',
              render: (amount: number) => (
                <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
                  {formatCurrency(amount || 0)}
                </span>
              ),
              align: 'right' as const,
              width: 150,
            },
            {
              title: 'تاريخ الاستحقاق',
              dataIndex: 'dueDate',
              key: 'dueDate',
              render: (date: string) => moment(date).format('YYYY-MM-DD'),
              width: 120,
            },
            {
              title: 'تاريخ الدفع',
              dataIndex: 'paidDate',
              key: 'paidDate',
              render: (date: string | null) => date ? moment(date).format('YYYY-MM-DD') : '-',
              width: 120,
            },
            {
              title: 'الحالة',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const statusConfig: Record<string, { color: string; text: string }> = {
                  paid: { color: 'green', text: 'مدفوع' },
                  pending: { color: 'orange', text: 'قيد الانتظار' },
                  overdue: { color: 'red', text: 'متأخر' },
                  cancelled: { color: 'default', text: 'ملغي' },
                }
                const config = statusConfig[status] || { color: 'default', text: status || 'غير محدد' }
                return <Tag color={config.color}>{config.text}</Tag>
              },
              width: 100,
            },
          ]}
          dataSource={payments
            .filter(p => {
              // Exclude general expenses
              const isGeneralExpense = p.isGeneralExpense || (!p.projectId && p.expenseCategory)
              if (isGeneralExpense) return false
              
              // If paymentType is undefined but contractId exists, treat as income
              const isIncome = p.paymentType === 'income' || (p.paymentType === undefined && p.contractId)
              return isIncome
            })
            .map(p => ({ ...p, key: `income-${p.id}` }))}
          pagination={{ 
            pageSize: 5, 
            showSizeChanger: true, 
            showTotal: (total) => `إجمالي ${total} مستخلص`
          }}
          locale={{ emptyText: 'لا توجد مستخلصات مسجلة' }}
        />
      </Card>

      {/* Unified Ledger Table */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <Title level={4} style={{ margin: 0 }}>سجل المصاريف والمشتريات</Title>
            <span style={{ fontSize: '12px', color: '#999', marginRight: 8 }}>
              (المصاريف العامة مستثناة)
            </span>
          </div>
        }
      >
        {unifiedLedger.length === 0 ? (
          <Empty 
            description="لا توجد معاملات لهذا المشروع"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={ledgerColumns}
            dataSource={unifiedLedger}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true, 
              showTotal: (total) => `إجمالي ${total} معاملة`
            }}
            scroll={{ x: 'max-content' }}
            summary={() => {
              const total = unifiedLedger.reduce((sum, item) => sum + (item.amount || 0), 0)
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <strong style={{ fontSize: '16px' }}>الإجمالي:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong style={{ color: '#1890ff', fontSize: '18px' }}>
                        {formatCurrency(total)}
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )
            }}
          />
        )}
      </Card>

      {/* Invoice/Milestone Creation Modal */}
      <Modal
        title="إضافة مستخلص/مرحلة جديدة"
        open={invoiceModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setInvoiceModalVisible(false)
          form.resetFields()
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateInvoice}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="description"
            label="الوصف/اسم المرحلة"
            rules={[{ required: true, message: 'يرجى إدخال الوصف' }]}
          >
            <Input placeholder="مثال: مرحلة الأساسات، مرحلة البنية التحتية..." />
          </Form.Item>

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
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="تاريخ الاستحقاق"
                rules={[{ required: true, message: 'يرجى اختيار تاريخ الاستحقاق' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="الحالة"
                initialValue="pending"
              >
                <Select>
                  <Option value="pending">قيد الانتظار</Option>
                  <Option value="paid">مدفوع</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}
          >
            {({ getFieldValue }) =>
              getFieldValue('status') === 'paid' ? (
                <Form.Item
                  name="paidDate"
                  label="تاريخ الدفع"
                  rules={[{ required: true, message: 'يرجى اختيار تاريخ الدفع' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="paymentMethod"
                label="طريقة الدفع (اختياري)"
              >
                <Select placeholder="اختر طريقة الدفع" allowClear>
                  <Option value="cash">نقدي</Option>
                  <Option value="bank_transfer">تحويل بنكي</Option>
                  <Option value="check">شيك</Option>
                  <Option value="other">أخرى</Option>
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

          <Form.Item name="notes" label="ملاحظات (اختياري)">
            <TextArea rows={3} placeholder="ملاحظات إضافية..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectDetails