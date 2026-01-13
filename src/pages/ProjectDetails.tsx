'use client'

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import projectsService from '../services/projectsService'
import ordersService from '../services/ordersService'
import contractsService from '../services/contractsService'
import paymentsService from '../services/paymentsService'
import incomesService from '../services/incomesService'
import treasuryService from '../services/treasuryService'
import laborGroupsService from '../services/laborGroupsService'
import { supabase } from '../services/supabaseClient'
import tenantStore from '../services/tenantStore'
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
  Tabs,
  Alert,
  Checkbox
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
  const [laborGroups, setLaborGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false)
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([])
  const [hasExistingIncomes, setHasExistingIncomes] = useState<boolean>(false)
  const [loadingProjectIncomes, setLoadingProjectIncomes] = useState(false)
  const [paymentsWithTreasuryAccounts, setPaymentsWithTreasuryAccounts] = useState<any[]>([])
  const [expenseModalVisible, setExpenseModalVisible] = useState(false)
  const [expenseForm] = Form.useForm()
  const [engineerAdvances, setEngineerAdvances] = useState<any[]>([])
  const [previousCompletionPercentage, setPreviousCompletionPercentage] = useState<number | null>(null)
  const [isCorrectionMode, setIsCorrectionMode] = useState(false)

  useEffect(() => {
    if (id) {
      loadProjectDetails()
      loadTreasuryAccounts()
      checkExistingIncomes()
    }
  }, [id])

  // Check if project has existing incomes
  const checkExistingIncomes = async () => {
    if (!id) return
    setLoadingProjectIncomes(true)
    try {
      const hasIncomes = await incomesService.hasExistingIncomes(id)
      setHasExistingIncomes(hasIncomes)
    } catch (error) {
      console.error('Error checking existing incomes:', error)
      setHasExistingIncomes(false)
    } finally {
      setLoadingProjectIncomes(false)
    }
  }

  // Get previous completion percentage for smart validation
  const getPreviousCompletionPercentage = async () => {
    if (!id || !project) return null
    try {
      // Get the highest completion percentage from existing incomes
      const { data: payments, error } = await supabase
        .from('payments')
        .select('completion_percentage')
        .eq('tenant_id', tenantStore.getTenantId())
        .eq('project_id', id)
        .or('contract_id.not.is.null,payment_type.eq.income')
        .not('completion_percentage', 'is', null)
        .order('completion_percentage', { ascending: false })
        .limit(1)

      if (error) throw error
      
      if (payments && payments.length > 0 && payments[0].completion_percentage !== null) {
        return parseFloat(payments[0].completion_percentage)
      }
      
      // Fallback to project's current completion percentage
      return project.completionPercentage || 0
    } catch (error) {
      console.error('Error fetching previous completion percentage:', error)
      return project.completionPercentage || 0
    }
  }

  // Load engineer advances for custody deduction
  const loadEngineerAdvances = async (engineerName: string) => {
    try {
      const advances = await laborGroupsService.getEngineerAdvances(engineerName, null)
      setEngineerAdvances(advances || [])
    } catch (error) {
      console.error('Error loading engineer advances:', error)
      setEngineerAdvances([])
    }
  }

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
      const [projectOrders, projectContracts, projectPayments, paidLaborGroups] = await Promise.all([
        ordersService.getOrdersByProject(id),
        contractsService.getContractsByProject(id),
        paymentsService.getPaymentsByProject(id),
        laborGroupsService.getPaidLaborGroupsByProject(id)
      ])

      setOrders(projectOrders || [])
      setContracts(projectContracts || [])
      setPayments(projectPayments || [])
      setLaborGroups(paidLaborGroups || [])
      
      // Fetch treasury account names for income payments (async, don't await)
      loadTreasuryAccountNamesForPayments(projectPayments || [])
    } catch (error) {
      console.error('Error loading project details:', error)
      message.error('فشل في تحميل بيانات المشروع')
    } finally {
      setLoading(false)
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

  // Load treasury account names for payments (for Inflows/Advances table)
  const loadTreasuryAccountNamesForPayments = async (paymentsList: any[]) => {
    try {
      const tenantId = tenantStore.getTenantId()
      if (!tenantId || !paymentsList || paymentsList.length === 0) {
        setPaymentsWithTreasuryAccounts([])
        return
      }

      // Get income payment IDs (payments that are income/advances)
      // Include both investor inflows and employee advances
      const incomePaymentIds = paymentsList
        .filter(p => {
          const isGeneralExpense = p.isGeneralExpense || (!p.projectId && p.expenseCategory)
          if (isGeneralExpense) return false
          const isIncome = p.paymentType === 'income' || (p.paymentType === undefined && p.contractId)
          const isEmployeeAdvance = p.transactionType === 'advance' && p.managerName && p.projectId
          return isIncome || isEmployeeAdvance
        })
        .map(p => p.id)

      if (incomePaymentIds.length === 0) {
        setPaymentsWithTreasuryAccounts([])
        return
      }

      // Fetch treasury transactions for these payments
      // Employee advances use reference_type = 'expense', investor inflows use 'income'
      const { data: treasuryTransactions, error } = await supabase
        .from('treasury_transactions')
        .select(`
          reference_id,
          account_id,
          treasury_accounts:account_id (
            id,
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .in('reference_type', ['income', 'expense'])
        .in('reference_id', incomePaymentIds)

      if (error) {
        console.error('Error fetching treasury transactions:', error)
        setPaymentsWithTreasuryAccounts([])
        return
      }

      // Create a map of payment ID -> account name
      const treasuryAccountMap: Record<string, string> = {}
      if (treasuryTransactions) {
        treasuryTransactions.forEach((txn: any) => {
          if (txn.reference_id && txn.treasury_accounts) {
            treasuryAccountMap[txn.reference_id] = txn.treasury_accounts.name
          }
        })
      }

      // Enrich payments with treasury account names
      const enrichedPayments = paymentsList.map(payment => ({
        ...payment,
        treasuryAccountName: treasuryAccountMap[payment.id] || null
      }))

      setPaymentsWithTreasuryAccounts(enrichedPayments)
    } catch (error) {
      console.error('Error loading treasury account names for payments:', error)
      setPaymentsWithTreasuryAccounts([])
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

    // Add paid labor groups total
    const laborGroupsTotal = laborGroups.reduce((sum, group) => {
      return sum + (parseFloat(group.totalAmount) || 0)
    }, 0)

    return ordersTotal + expensePaymentsTotal + laborGroupsTotal
  }

  // Calculate Total Labor Cost: Sum of all paid labor groups
  const calculateTotalLaborCost = () => {
    return laborGroups.reduce((sum, group) => {
      return sum + (parseFloat(group.totalAmount) || 0)
    }, 0)
  }

  // Calculate Total Collected (Income): Sum of all Income Payments (client payments)
  // CRITICAL: Only count Investor Inflows, NOT Employee Advances
  const calculateTotalCollected = () => {
    return payments.reduce((sum, payment) => {
      // Only count income payments (client payments/investor inflows) that are paid
      // Exclude employee advances (transaction_type = 'advance' with manager_name)
      const isIncome = payment.paymentType === 'income' || (payment.paymentType === undefined && payment.contractId)
      const isEmployeeAdvance = payment.transactionType === 'advance' && payment.managerName
      
      // Count only investor inflows, exclude employee advances
      if (isIncome && !isEmployeeAdvance && payment.status === 'paid') {
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
    const scopeBreakdown = project.workScopes?.map(scope => {
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

    // Add payments to ledger (expense only - exclude income payments, advances, and milestone payments)
    // Exclude general expenses and income payments from project ledger
    payments.forEach(payment => {
      // Skip general expenses (those without project_id or with isGeneralExpense flag)
      const isGeneralExpense = payment.isGeneralExpense || (!payment.projectId && payment.expenseCategory)
      if (isGeneralExpense) {
        return // Skip general expenses in project ledger
      }

      // Determine if income/advance/milestone payment: exclude these from expense ledger
      // These should ONLY appear in the "واردات أو سلف" section
      // CRITICAL: Explicitly check for ALL possible income indicators
      const isIncome = payment.paymentType === 'income' || payment.payment_type === 'income'
      const isAdvance = payment.transactionType === 'advance' || payment.transaction_type === 'advance'
      const isMilestonePayment = payment.contractId || payment.contract_id // Milestone payments have contractId
      
      // CRITICAL: Exclude income payments, advances, and milestone payments from expense/procurement ledger
      // Double-check: if payment_type is 'income' OR transaction_type is 'advance' OR has contractId, it's an income
      if (isIncome || isAdvance || isMilestonePayment) {
        return // Skip income payments, advances, and milestone payments - they belong in the incomes section only
      }
      
      // Additional safety check: if paymentType is undefined/null but contractId exists, it's likely an income
      if (!payment.paymentType && !payment.payment_type && (payment.contractId || payment.contract_id)) {
        return // Skip - this is a client payment (income), not an expense
      }

      // Only add expense payments
      const paymentType = payment.paymentType || 'expense'
      ledger.push({
        key: `payment-${payment.id}`,
        id: payment.id,
        type: 'payment',
        paymentType: paymentType,
        typeLabel: 'دفعة (مصروف)',
        date: payment.paidDate || payment.dueDate,
        description: `دفعة ${payment.paymentNumber}${payment.workScope ? ` - ${payment.workScope}` : ''}`,
        customer: 'المورد',
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

  // Handle income/advance creation
  const handleCreateInvoice = async (values: any) => {
    try {
      // Validate treasury account
      if (!values.treasuryAccountId) {
        message.error('يرجى اختيار حساب الخزينة')
        return
      }

      // Validate transaction type
      if (!values.transactionType) {
        message.error('يرجى اختيار نوع المعاملة')
        return
      }

      // Use paidDate if status is paid, otherwise use dueDate
      const transactionDate = values.status === 'paid' && values.paidDate
        ? moment(values.paidDate).format('YYYY-MM-DD')
        : (values.dueDate ? moment(values.dueDate).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'))

      // Route to correct service based on transaction type
      if (values.transactionType === 'investor_inflow') {
        // Type A: Investor Inflow - use incomesService
        const incomeData = {
          projectId: id,
          projectName: project?.name || '',
          date: transactionDate,
          amount: values.amount,
          incomeType: values.incomeType || 'down_payment',
          treasuryAccountId: values.treasuryAccountId,
          description: values.description || null,
          referenceNumber: values.referenceNumber || null,
          workScope: values.workScope || null,
          completionPercentage: values.incomeType === 'advance' ? values.completionPercentage : null
        }

        const result = await incomesService.createIncome(incomeData)
        
        if (result.success) {
          // Update project completion percentage if milestone advance
          if (values.incomeType === 'advance' && values.completionPercentage !== null && values.completionPercentage !== undefined) {
            try {
              await projectsService.updateProject(id, {
                completionPercentage: values.completionPercentage
              })
            } catch (error) {
              console.error('Error updating project completion percentage:', error)
              // Don't show error to user - income was saved successfully
            }
          }

          message.success('تم إنشاء وارد المستثمر بنجاح')
          setInvoiceModalVisible(false)
          form.resetFields()
          await loadProjectDetails() // Reload data
          loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
        } else {
          message.error(result.error || 'فشل في إنشاء وارد المستثمر')
        }
      } else if (values.transactionType === 'employee_advance') {
        // Type B: Employee Advance - use paymentsService
        if (!values.managerName || values.managerName.trim() === '') {
          message.error('يرجى إدخال اسم المهندس/الموظف')
          return
        }

        // Generate advance reference number
        const advanceRefNumber = await paymentsService.generateAdvanceReferenceNumber()

        const advanceData = {
          projectId: id, // Link to project
          transactionType: 'advance',
          managerName: values.managerName.trim(),
          amount: values.amount,
          dueDate: transactionDate,
          paidDate: values.status === 'paid' ? transactionDate : null,
          status: values.status || 'pending',
          referenceNumber: values.referenceNumber || advanceRefNumber,
          notes: values.description || null,
          workScope: values.workScope || null,
          isGeneralExpense: false, // Linked to project, not general expense
          treasuryAccountId: values.treasuryAccountId // Will be used to create treasury transaction
        }

        const result = await paymentsService.createPayment(advanceData)
        
        if (result.success) {
          // Create treasury transaction for employee advance (outflow - money going out)
          const treasuryResult = await treasuryService.createTransaction({
            accountId: values.treasuryAccountId,
            transactionType: 'outflow', // Outflow - money going out to employee
            amount: values.amount,
            referenceType: 'expense', // Employee advances are expenses
            referenceId: result.payment.id,
            description: `صرف عهدة لمهندس: ${values.managerName} - مشروع: ${project?.name || ''}`
          })

          if (!treasuryResult.success) {
            console.error('Error creating treasury transaction for advance:', treasuryResult.error)
            // Don't fail the whole operation, but log the error
            message.warning('تم إنشاء العهدة بنجاح، لكن حدث خطأ في تحديث الخزينة')
          }

          message.success('تم إنشاء عهدة الموظف بنجاح')
          setInvoiceModalVisible(false)
          form.resetFields()
          await loadProjectDetails() // Reload data
          loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
        } else {
          message.error(result.error || 'فشل في إنشاء عهدة الموظف')
        }
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      message.error('حدث خطأ أثناء إنشاء المعاملة')
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
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
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
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
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
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
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
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>{orders.length} أمر شراء + {payments.filter(p => (p.paymentType === 'expense' || (p.paymentType === undefined && !p.contractId)) && p.status === 'paid').length} دفعة مصروف + {laborGroups.length} مجموعة عمالة</div>
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
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>الهامش: {profitMargin.toFixed(2)}%</div>
              <div>صافي الهامش: {formatCurrency(netMargin)}</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Total Labor Cost Card */}
      {calculateTotalLaborCost() > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} lg={8}>
            <Card 
              style={{
                background: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)',
                border: 'none',
                height: '100%'
              }}
              bodyStyle={{ padding: 24 }}
            >
              <Statistic
                title={<span style={{ color: 'white', fontSize: '16px' }}>إجمالي تكلفة العمالة</span>}
                value={calculateTotalLaborCost()}
                prefix={<UserOutlined style={{ color: 'white' }} />}
                suffix={<span style={{ color: 'white' }}>ريال</span>}
                styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
              />
              <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                <div>{laborGroups.length} مجموعة عمالة مدفوعة</div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

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
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {scopeBreakdown?.map((scope) => (
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

      {/* Incomes & Advances Section */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InboxOutlined />
              <Title level={4} style={{ margin: 0 }}>واردات أو سلف</Title>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={async () => {
                await checkExistingIncomes()
                setInvoiceModalVisible(true)
              }}
            >
              إضافة وارد/سلفة
            </Button>
          </div>
        }
      >
        <Table
          columns={[
            {
              title: 'نوع المعاملة',
              dataIndex: 'transactionType',
              key: 'transactionType',
              width: 150,
              render: (transactionType: string, record: any) => {
                // Check if it's an employee advance
                const isEmployeeAdvance = transactionType === 'advance' && record.managerName
                const isInvestorInflow = record.paymentType === 'income' || (record.paymentType === undefined && record.contractId)
                
                if (isEmployeeAdvance) {
                  return <Tag color="orange">عهدة مهندس</Tag>
                } else if (isInvestorInflow) {
                  return <Tag color="green">وارد مستثمر</Tag>
                } else {
                  return <Tag color="blue">مستخلص</Tag>
                }
              },
            },
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
                  {record.managerName && (
                    <Tag color="orange" style={{ marginTop: 4 }}>المهندس: {record.managerName}</Tag>
                  )}
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
              title: 'الخزينة/الحساب',
              dataIndex: 'treasuryAccountName',
              key: 'treasuryAccountName',
              render: (accountName: string | null) => (
                <span style={{ fontWeight: 500 }}>
                  {accountName || '-'}
                </span>
              ),
              width: 150,
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
          dataSource={(paymentsWithTreasuryAccounts.length > 0 ? paymentsWithTreasuryAccounts : payments)
            ?.filter((p: any) => {
              // Exclude general expenses
              const isGeneralExpense = p.isGeneralExpense || (!p.projectId && p.expenseCategory)
              if (isGeneralExpense) return false
              
              // Include investor inflows (income payments)
              const isIncome = p.paymentType === 'income' || (p.paymentType === undefined && p.contractId)
              
              // Include employee advances (transaction_type = 'advance' with manager_name and project_id)
              const isEmployeeAdvance = p.transactionType === 'advance' && p.managerName && p.projectId
              
              return isIncome || isEmployeeAdvance
            })
            ?.map((p: any) => ({ ...p, key: `income-${p.id}` })) || []}
          pagination={{ 
            pageSize: 5, 
            showSizeChanger: true, 
            showTotal: (total) => `إجمالي ${total} مستخلص`
          }}
          locale={{ emptyText: 'لا توجد مستخلصات مسجلة' }}
        />
      </Card>

      {/* Project Expenses Section */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingOutlined />
              <Title level={4} style={{ margin: 0 }}>مصاريف المشروع</Title>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                expenseForm.resetFields()
                expenseForm.setFieldsValue({ date: moment() })
                setExpenseModalVisible(true)
              }}
            >
              إضافة مصروف جديد
            </Button>
          </div>
        }
      >
        <Alert
          message="تنبيه: المصاريف المدخلة هنا مرتبطة حصرياً بهذا المشروع"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={[
            {
              title: 'التاريخ',
              dataIndex: 'date',
              key: 'date',
              render: (date: string) => moment(date).format('YYYY-MM-DD'),
              width: 120,
            },
            {
              title: 'نوع المصروف',
              dataIndex: 'expenseType',
              key: 'expenseType',
              render: (type: string) => {
                const typeMap: Record<string, { color: string; text: string }> = {
                  'purchase_order': { color: 'blue', text: 'أمر شراء' },
                  'custody_deduction': { color: 'orange', text: 'خصم من عهدة' },
                  'general_expense': { color: 'purple', text: 'مصروف عام' },
                }
                const config = typeMap[type] || { color: 'default', text: type }
                return <Tag color={config.color}>{config.text}</Tag>
              },
              width: 150,
            },
            {
              title: 'نوع العنصر',
              dataIndex: 'itemType',
              key: 'itemType',
              render: (itemType: string) => itemType || '-',
            },
            {
              title: 'المبلغ',
              dataIndex: 'amount',
              key: 'amount',
              render: (amount: number) => (
                <span style={{ fontWeight: 'bold', color: '#ff4d4f', fontSize: '16px' }}>
                  {formatCurrency(amount || 0)}
                </span>
              ),
              align: 'right' as const,
              width: 150,
            },
            {
              title: 'المهندس',
              dataIndex: 'engineerName',
              key: 'engineerName',
              render: (name: string) => name || '-',
              width: 150,
            },
            {
              title: 'الوصف',
              dataIndex: 'description',
              key: 'description',
            },
          ]}
          dataSource={payments
            .filter((p: any) => {
              // Only show project expenses (not general expenses, not income)
              const isExpense = p.paymentType === 'expense' || (p.paymentType === undefined && !p.contractId)
              const isGeneralExpense = p.isGeneralExpense || (!p.projectId && p.expenseCategory)
              const isIncome = p.paymentType === 'income' || (p.paymentType === undefined && p.contractId)
              return isExpense && !isGeneralExpense && !isIncome && p.projectId === id
            })
            .map((p: any, index: number) => ({
              key: `expense-${p.id}-${index}`,
              date: p.paidDate || p.dueDate,
              expenseType: p.transactionType === 'advance' ? 'custody_deduction' : 
                          p.expenseCategory ? 'general_expense' : 'purchase_order',
              itemType: p.expenseCategory || 'مصروف مشروع',
              amount: parseFloat(p.amount) || 0,
              engineerName: p.managerName || null,
              description: p.notes || '-',
            }))}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true, 
            showTotal: (total) => `إجمالي ${total} مصروف`
          }}
          locale={{ emptyText: 'لا توجد مصاريف مسجلة' }}
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
        title="إضافة وارد/سلفة جديدة"
        open={invoiceModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setInvoiceModalVisible(false)
          form.resetFields()
          setIsCorrectionMode(false)
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={600}
        afterOpenChange={async (open) => {
          if (open) {
            // Reset form when modal opens
            form.resetFields()
            // Reset correction mode
            setIsCorrectionMode(false)
            // Set default transaction type to investor_inflow
            form.setFieldsValue({ transactionType: 'investor_inflow' })
            // Set default income type when modal opens
            if (hasExistingIncomes) {
              form.setFieldsValue({ incomeType: 'advance' })
              // Fetch previous completion percentage for smart validation
              const prevCompletion = await getPreviousCompletionPercentage()
              setPreviousCompletionPercentage(prevCompletion)
            } else {
              form.setFieldsValue({ incomeType: 'down_payment' })
              setPreviousCompletionPercentage(null)
            }
          }
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateInvoice}
          style={{ marginTop: 24 }}
        >
          {/* Transaction Type Selector - FIRST FIELD */}
          <Form.Item
            name="transactionType"
            label="نوع المعاملة"
            rules={[{ required: true, message: 'يرجى اختيار نوع المعاملة' }]}
            initialValue="investor_inflow"
          >
            <Select 
              placeholder="اختر نوع المعاملة"
              onChange={(value) => {
                // Reset dependent fields when transaction type changes
                if (value === 'employee_advance') {
                  form.setFieldsValue({ 
                    incomeType: undefined,
                    completionPercentage: undefined 
                  })
                } else {
                  // Reset manager name when switching to investor inflow
                  form.setFieldsValue({ managerName: undefined })
                }
              }}
            >
              <Option value="investor_inflow">وارد من مستثمر</Option>
              <Option value="employee_advance">سلفة عهدة لموظف</Option>
            </Select>
          </Form.Item>

          {/* Conditional: Show income type only for investor inflows */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.transactionType !== currentValues.transactionType}
          >
            {({ getFieldValue }) => {
              const transactionType = getFieldValue('transactionType')
              
              if (transactionType === 'investor_inflow') {
                return (
                  <Form.Item
                    name="incomeType"
                    label="نوع الوارد"
                    rules={[{ required: true, message: 'يرجى اختيار نوع الوارد' }]}
                    initialValue="down_payment"
                  >
                    <Select 
                      placeholder="اختر نوع الوارد"
                      disabled={hasExistingIncomes ? false : true}
                      loading={loadingProjectIncomes}
                      onChange={async (value) => {
                        if (value !== 'advance') {
                          form.setFieldsValue({ completionPercentage: undefined })
                          setPreviousCompletionPercentage(null)
                        } else {
                          // Fetch previous completion percentage when advance is selected
                          const prevCompletion = await getPreviousCompletionPercentage()
                          setPreviousCompletionPercentage(prevCompletion)
                        }
                      }}
                    >
                      <Option value="down_payment" disabled={hasExistingIncomes}>
                        عربون مقدم
                        {hasExistingIncomes && ' (غير متاح - يوجد واردات سابقة)'}
                      </Option>
                      <Option value="advance" disabled={!hasExistingIncomes}>
                        سلفة مرحلة
                        {!hasExistingIncomes && ' (غير متاح - لا يوجد واردات سابقة)'}
                      </Option>
                    </Select>
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>

          {/* Conditional: Show helper text only for investor inflows */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.transactionType !== currentValues.transactionType}
          >
            {({ getFieldValue }) => {
              const transactionType = getFieldValue('transactionType')
              
              if (transactionType === 'investor_inflow' && id) {
                return (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: -16, marginBottom: 8 }}>
                    {hasExistingIncomes 
                      ? 'يوجد واردات سابقة - يجب اختيار "سلفة مرحلة"'
                      : 'لا يوجد واردات سابقة - يجب اختيار "عربون مقدم"'
                    }
                  </div>
                )
              }
              return null
            }}
          </Form.Item>

          {/* Conditional: Show manager name field only for employee advances */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.transactionType !== currentValues.transactionType}
          >
            {({ getFieldValue }) => {
              const transactionType = getFieldValue('transactionType')
              
              if (transactionType === 'employee_advance') {
                return (
                  <Form.Item
                    name="managerName"
                    label="اسم المهندس/الموظف"
                    rules={[{ required: true, message: 'يرجى إدخال اسم المهندس/الموظف' }]}
                  >
                    <Input placeholder="مثال: أحمد محمد" />
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>

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
                {availableWorkScopes?.map(scope => (
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

          {/* Completion Percentage - Only show for milestone advance */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.incomeType !== currentValues.incomeType}
          >
            {({ getFieldValue }) => {
              const incomeType = getFieldValue('incomeType')
              
              // Show completion percentage if advance is selected AND project has existing incomes
              if (incomeType === 'advance' && id) {
                return (
                  <>
                    {previousCompletionPercentage !== null && (
                      <Alert
                        message={`النسبة السابقة: ${previousCompletionPercentage}%`}
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}
                    <Form.Item
                      name="completionPercentage"
                      label="نسبة الإنجاز السابقة (%)"
                      rules={[
                        { required: true, message: 'يرجى إدخال نسبة الإنجاز السابقة' },
                        { type: 'number', min: 0, max: 100, message: 'يجب أن تكون النسبة بين 0 و 100' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value) {
                              return Promise.resolve()
                            }
                            if (previousCompletionPercentage !== null && value < previousCompletionPercentage && !isCorrectionMode) {
                              return Promise.reject(new Error('عفواً، نسبة الإنجاز لا يمكن أن تقل عن النسبة الحالية. قم بتفعيل وضع التصحيح إذا كنت تعدل خطأ سابقاً.'))
                            }
                            return Promise.resolve()
                          }
                        })
                      ]}
                      tooltip="نسبة الإنجاز السابقة للمشروع قبل استلام هذه السلفة"
                    >
                      <InputNumber
                        min={isCorrectionMode ? 0 : (previousCompletionPercentage !== null ? previousCompletionPercentage : 0)}
                        max={100}
                        style={{ width: '100%' }}
                        placeholder="0"
                        formatter={value => `${value}%`}
                        parser={value => value!.replace('%', '')}
                      />
                    </Form.Item>
                    <Form.Item>
                      <Checkbox
                        checked={isCorrectionMode}
                        onChange={(e) => setIsCorrectionMode(e.target.checked)}
                      >
                        تفعيل وضع التصحيح (السماح بنسبة أقل من السابق)
                      </Checkbox>
                    </Form.Item>
                  </>
                )
              }
              return null
            }}
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
              {treasuryAccounts?.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="referenceNumber"
            label="رقم المرجع (اختياري)"
          >
            <Input placeholder="رقم المرجع أو رقم الإيصال" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Project Expense Modal */}
      <Modal
        title="إضافة مصروف جديد للمشروع"
        open={expenseModalVisible}
        onOk={() => expenseForm.submit()}
        onCancel={() => {
          setExpenseModalVisible(false)
          expenseForm.resetFields()
          setEngineerAdvances([])
        }}
        okText="حفظ"
        cancelText="إلغاء"
        width={700}
      >
        <Alert
          message="المصاريف المدخلة هنا مرتبطة حصرياً بهذا المشروع"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form
          form={expenseForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              if (!id) {
                message.error('معرف المشروع غير موجود')
                return
              }

              // Handle different expense types
              if (values.expenseType === 'purchase_order') {
                // Link to PO creation - navigate to orders page with project pre-selected
                message.info('سيتم توجيهك إلى صفحة أوامر الشراء لإنشاء أمر شراء جديد')
                navigate(`/orders?projectId=${id}`)
                setExpenseModalVisible(false)
                return
              } else if (values.expenseType === 'general_expense') {
                // Create general expense payment
                if (!values.treasuryAccountId) {
                  message.error('يرجى اختيار حساب الخزينة')
                  return
                }

                const expenseData = {
                  projectId: id,
                  amount: values.amount,
                  dueDate: moment(values.date).format('YYYY-MM-DD'),
                  paidDate: moment(values.date).format('YYYY-MM-DD'),
                  status: 'paid',
                  expenseCategory: values.expenseCategory || 'Other',
                  notes: values.description || null,
                  isGeneralExpense: false, // Linked to project, not general
                  paymentType: 'expense',
                  treasuryAccountId: values.treasuryAccountId
                }

                const result = await paymentsService.createPayment(expenseData)
                
                if (result.success) {
                  // Create treasury transaction
                  await treasuryService.createTransaction({
                    accountId: values.treasuryAccountId,
                    transactionType: 'outflow',
                    amount: values.amount,
                    referenceType: 'expense',
                    referenceId: result.payment.id,
                    description: `مصروف مشروع: ${values.description || ''} - مشروع: ${project?.name || ''}`
                  })

                  message.success('تم إنشاء المصروف بنجاح')
                  setExpenseModalVisible(false)
                  expenseForm.resetFields()
                  await loadProjectDetails()
                } else {
                  message.error(result.error || 'فشل في إنشاء المصروف')
                }
              } else if (values.expenseType === 'custody_deduction') {
                // Deduct from custody
                if (!values.linkedAdvanceId) {
                  message.error('يرجى اختيار العهدة')
                  return
                }
                if (!values.engineerName) {
                  message.error('يرجى إدخال اسم المهندس')
                  return
                }

                const selectedAdvance = engineerAdvances.find(a => a.id === values.linkedAdvanceId)
                if (!selectedAdvance) {
                  message.error('العهدة المحددة غير موجودة')
                  return
                }

                const remaining = selectedAdvance.remainingAmount !== null && selectedAdvance.remainingAmount !== undefined
                  ? parseFloat(selectedAdvance.remainingAmount)
                  : parseFloat(selectedAdvance.amount || 0)

                if (values.amount > remaining) {
                  message.error(`رصيد العهدة غير كاف. المتاح: ${remaining.toFixed(2)} ريال`)
                  return
                }

                const expenseData = {
                  projectId: id,
                  amount: values.amount,
                  dueDate: moment(values.date).format('YYYY-MM-DD'),
                  paidDate: moment(values.date).format('YYYY-MM-DD'),
                  status: 'paid',
                  transactionType: 'expense',
                  managerName: values.engineerName,
                  linkedAdvanceId: values.linkedAdvanceId,
                  notes: values.description || `خصم من عهدة: ${selectedAdvance.referenceNumber || selectedAdvance.paymentNumber}`,
                  isGeneralExpense: false,
                  paymentType: 'expense'
                }

                const result = await paymentsService.createPayment(expenseData)
                
                if (result.success) {
                  // Update advance remaining amount
                  const newRemaining = remaining - values.amount
                  await paymentsService.updatePayment(values.linkedAdvanceId, {
                    remainingAmount: Math.max(0, newRemaining)
                  })

                  message.success('تم خصم المصروف من العهدة بنجاح')
                  setExpenseModalVisible(false)
                  expenseForm.resetFields()
                  setEngineerAdvances([])
                  await loadProjectDetails()
                } else {
                  message.error(result.error || 'فشل في خصم المصروف')
                }
              }
            } catch (error) {
              console.error('Error creating expense:', error)
              message.error('حدث خطأ أثناء إنشاء المصروف')
            }
          }}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="date"
            label="التاريخ"
            rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
            initialValue={moment()}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="expenseType"
            label="نوع المصروف"
            rules={[{ required: true, message: 'يرجى اختيار نوع المصروف' }]}
          >
            <Select
              placeholder="اختر نوع المصروف"
              onChange={(value) => {
                expenseForm.setFieldsValue({
                  treasuryAccountId: undefined,
                  linkedAdvanceId: undefined,
                  engineerName: undefined,
                  expenseCategory: undefined
                })
                setEngineerAdvances([])
              }}
            >
              <Option value="purchase_order">أمر شراء</Option>
              <Option value="custody_deduction">خصم من عهدة</Option>
              <Option value="general_expense">مصروف عام</Option>
            </Select>
          </Form.Item>

          {/* Conditional: Show custody selection for custody deduction */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.expenseType !== currentValues.expenseType}
          >
            {({ getFieldValue }) => {
              const expenseType = getFieldValue('expenseType')
              
              if (expenseType === 'custody_deduction') {
                return (
                  <>
                    <Form.Item
                      name="engineerName"
                      label="اسم المهندس"
                      rules={[{ required: true, message: 'يرجى إدخال اسم المهندس' }]}
                    >
                      <Input
                        placeholder="اسم المهندس"
                        onChange={async (e) => {
                          const name = e.target.value
                          if (name && name.trim()) {
                            await loadEngineerAdvances(name.trim())
                          } else {
                            setEngineerAdvances([])
                          }
                        }}
                      />
                    </Form.Item>
                    <Form.Item
                      name="linkedAdvanceId"
                      label="اختر العهدة"
                      rules={[{ required: true, message: 'يرجى اختيار العهدة' }]}
                    >
                      <Select
                        placeholder="اختر العهدة"
                        disabled={engineerAdvances.length === 0}
                        notFoundContent={engineerAdvances.length === 0 ? "لا توجد عهد متاحة" : null}
                      >
                        {engineerAdvances.map(advance => {
                          const remaining = advance.remainingAmount !== null && advance.remainingAmount !== undefined
                            ? parseFloat(advance.remainingAmount)
                            : parseFloat(advance.amount || 0)
                          const refNumber = advance.referenceNumber || advance.paymentNumber || 'ADV-XXX'
                          return (
                            <Option key={advance.id} value={advance.id}>
                              {refNumber} - متاح: {remaining.toFixed(2)} ريال
                            </Option>
                          )
                        })}
                      </Select>
                    </Form.Item>
                  </>
                )
              }
              return null
            }}
          </Form.Item>

          {/* Conditional: Show treasury account for general expense */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.expenseType !== currentValues.expenseType}
          >
            {({ getFieldValue }) => {
              const expenseType = getFieldValue('expenseType')
              
              if (expenseType === 'general_expense') {
                return (
                  <Form.Item
                    name="treasuryAccountId"
                    label="الخزينة/الصندوق"
                    rules={[{ required: true, message: 'يرجى اختيار الخزينة/الصندوق' }]}
                  >
                    <Select placeholder="اختر الخزينة/الصندوق">
                      {treasuryAccounts.map(acc => (
                        <Option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type === 'bank' ? 'بنك' : acc.type === 'cash_box' ? 'صندوق' : acc.type})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )
              }
              return null
            }}
          </Form.Item>

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

          <Form.Item
            name="description"
            label="الوصف"
            rules={[{ required: true, message: 'يرجى إدخال الوصف' }]}
          >
            <TextArea rows={3} placeholder="وصف المصروف..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectDetails