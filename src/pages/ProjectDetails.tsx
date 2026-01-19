'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useBranch } from '../contexts/BranchContext'
import { getTranslations } from '../utils/translations'
import { formatCurrencyWithSymbol, formatCurrencyLabel, getCurrencySymbol } from '../utils/currencyUtils'
import projectsService from '../services/projectsService'
import ordersService from '../services/ordersService'
import contractsService from '../services/contractsService'
import paymentsService from '../services/paymentsService'
import incomesService from '../services/incomesService'
import treasuryService from '../services/treasuryService'
import laborGroupsService from '../services/laborGroupsService'
import { supabase } from '../services/supabaseClient'
import tenantStore from '../services/tenantStore'
import branchStore from '../services/branchStore'
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
  const { language } = useLanguage()
  const { branchCurrency } = useBranch()
  const t = getTranslations(language)
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
  // Use branch currency as the single source of truth
  const displayCurrency = branchCurrency || 'SAR'

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
      const tenantId = tenantStore.getTenantId()
      const branchId = branchStore.getBranchId()
      
      // MANDATORY BRANCH ISOLATION: Return NO DATA if branchId is null
      if (!branchId) {
        return project.completionPercentage || 0
      }
      
      // Get the highest completion percentage from existing incomes
      const { data: payments, error } = await supabase
        .from('payments')
        .select('completion_percentage')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId) // MANDATORY: Always filter by branch_id
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
        message.error(t.projects.projectNotFound || 'Project not found')
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
      message.error(t.projects.failedToLoadProject || 'Failed to load project data')
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
      active: { color: 'green', text: t.projects.active || 'Active' },
      on_hold: { color: 'orange', text: t.projects.onHold || 'On Hold' },
      completed: { color: 'blue', text: t.projects.completed || 'Completed' },
      cancelled: { color: 'red', text: t.projects.cancelled || 'Cancelled' },
    }
    return statusConfig[status] || { color: 'default', text: t.common.notSpecified }
  }

  // Format currency - use branch currency dynamically
  const formatCurrency = (amount: number) => {
    return formatCurrencyWithSymbol(amount, displayCurrency, language)
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
        typeLabel: t.orders.purchaseOrder || 'Purchase Order',
        date: order.createdAt,
        description: `${t.orders.purchaseOrder || 'Purchase Order'} ${order.workScope ? `- ${order.workScope}` : ''}`,
        customer: order.customerName || t.common.notSpecified,
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
        typeLabel: t.projectDetails.paymentExpense || 'Payment (Expense)',
        date: payment.paidDate || payment.dueDate,
        description: `${t.projectDetails.payment || 'Payment'} ${payment.paymentNumber}${payment.workScope ? ` - ${payment.workScope}` : ''}`,
        customer: t.common.supplier || 'Supplier',
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
        message.error(t.projectDetails.selectTreasuryAccount || 'Please select treasury account')
        return
      }

      // Validate transaction type
      if (!values.transactionType) {
        message.error(t.projectDetails.selectTransactionType || 'Please select transaction type')
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

          message.success(t.projectDetails.investorInflowCreated || 'Investor inflow created successfully')
          setInvoiceModalVisible(false)
          form.resetFields()
          await loadProjectDetails() // Reload data
          loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
        } else {
          message.error(result.error || (t.projectDetails.failedToCreateInvestorInflow || 'Failed to create investor inflow'))
        }
      } else if (values.transactionType === 'employee_advance') {
        // Type B: Employee Advance - use paymentsService
        if (!values.managerName || values.managerName.trim() === '') {
          message.error(t.projectDetails.enterEngineerName || 'Please enter engineer/employee name')
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
            description: `${t.projectDetails.advanceForEngineer || 'Advance for Engineer'}: ${values.managerName} - ${t.common.project || 'Project'}: ${project?.name || ''}`
          })

          if (!treasuryResult.success) {
            console.error('Error creating treasury transaction for advance:', treasuryResult.error)
            // Don't fail the whole operation, but log the error
            message.warning(t.projectDetails.advanceCreatedTreasuryError || 'Advance created successfully, but error updating treasury')
          }

          message.success(t.projectDetails.employeeAdvanceCreated || 'Employee advance created successfully')
          setInvoiceModalVisible(false)
          form.resetFields()
          await loadProjectDetails() // Reload data
          loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
        } else {
          message.error(result.error || (t.projectDetails.failedToCreateEmployeeAdvance || 'Failed to create employee advance'))
        }
      }
    } catch (error) {
      console.error('Error creating transaction:', error)
      message.error(t.projectDetails.errorCreatingTransaction || 'Error occurred while creating transaction')
    }
  }

  // Get available work scopes from project
  const availableWorkScopes = project?.workScopes || []

  // Table columns for unified ledger - Golden Template
  const ledgerColumns = useMemo(() => [
    {
      title: t.common.date,
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => moment(date).format('YYYY-MM-DD'),
      sorter: (a: any, b: any) => moment(a.date).unix() - moment(b.date).unix(),
      width: 120,
    },
    {
      title: t.common.type || 'Type',
      dataIndex: 'typeLabel',
      key: 'type',
      render: (typeLabel: string, record: any) => {
        const isIncome = record.paymentType === 'income'
        const color = isIncome ? 'green' : record.type === 'order' ? 'red' : 'orange'
        return (
          <Tag color={color}>
            {typeLabel}
            {record.isGeneralExpense && (
              <span style={{ marginRight: 4, fontSize: '10px' }}> / {t.projectDetails.generalExpense || 'General Expense'}</span>
            )}
          </Tag>
        )
      },
      width: 120,
    },
    {
      title: t.common.description,
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
      title: t.common.workScope || 'Work Scope',
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
      title: t.common.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: t.common.pending || 'Pending' },
          processing: { color: 'blue', text: t.common.processing || 'Processing' },
          shipped: { color: 'cyan', text: t.common.shipped || 'Shipped' },
          completed: { color: 'green', text: t.common.completed || 'Completed' },
          paid: { color: 'green', text: t.common.paid || 'Paid' },
          cancelled: { color: 'red', text: t.common.cancelled || 'Cancelled' },
        }
        const config = statusConfig[status] || { color: 'default', text: status || t.common.notSpecified }
        return <Tag color={config.color}>{config.text}</Tag>
      },
      width: 120,
    },
    {
      title: t.common.amount,
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) => {
        const isIncome = record.paymentType === 'income'
        const color = isIncome ? '#52c41a' : '#ff4d4f' // Green for income, Red for expense
        return (
          <span style={{ fontWeight: 'bold', color: color, fontSize: '16px' }}>
            {isIncome ? '+' : '-'}{formatCurrency(amount || 0, displayCurrency, displayCurrency, language)}
          </span>
        )
      },
      sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0),
      align: 'right' as const,
      width: 150,
    },
  ], [t, language])

  // Table columns for transactions/incomes - Extracted from inline JSX
  const transactionsColumns = useMemo(() => [
    {
      title: t.projectDetails.transactionType || 'Transaction Type',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 150,
      render: (transactionType: string, record: any) => {
        // Check if it's an employee advance
        const isEmployeeAdvance = transactionType === 'advance' && record.managerName
        const isInvestorInflow = record.paymentType === 'income' || (record.paymentType === undefined && record.contractId)
        
        if (isEmployeeAdvance) {
          return <Tag color="orange">{t.projectDetails.engineerAdvance || 'Engineer Advance'}</Tag>
        } else if (isInvestorInflow) {
          return <Tag color="green">{t.projectDetails.investorInflow || 'Investor Inflow'}</Tag>
        } else {
          return <Tag color="blue">{t.projectDetails.milestone || 'Milestone'}</Tag>
        }
      },
    },
    {
      title: t.projectDetails.milestoneNumber || 'Milestone Number',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      width: 150,
    },
    {
      title: t.projectDetails.descriptionMilestone || 'Description/Milestone',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>{notes || (t.projectDetails.milestone || 'Milestone')}</div>
          {record.managerName && (
            <Tag color="orange" style={{ marginTop: 4 }}>{t.projectDetails.engineer || 'Engineer'}: {record.managerName}</Tag>
          )}
          {record.workScope && (
            <Tag color="cyan" style={{ marginTop: 4 }}>{record.workScope}</Tag>
          )}
        </div>
      ),
    },
    {
      title: t.common.amount,
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '16px' }}>
          {formatCurrency(amount || 0, displayCurrency, displayCurrency, language)}
        </span>
      ),
      align: 'right' as const,
      width: 150,
    },
    {
      title: t.common.dueDate || 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => moment(date).format('YYYY-MM-DD'),
      width: 120,
    },
    {
      title: t.common.paidDate || 'Paid Date',
      dataIndex: 'paidDate',
      key: 'paidDate',
      render: (date: string | null) => date ? moment(date).format('YYYY-MM-DD') : '-',
      width: 120,
    },
    {
      title: t.projectDetails.treasuryAccount || 'Treasury/Account',
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
      title: t.common.status,
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; text: string }> = {
          paid: { color: 'green', text: t.common.paid || 'Paid' },
          pending: { color: 'orange', text: t.common.pending || 'Pending' },
          overdue: { color: 'red', text: t.common.overdue || 'Overdue' },
          cancelled: { color: 'default', text: t.common.cancelled || 'Cancelled' },
        }
        const config = statusConfig[status] || { color: 'default', text: status || t.common.notSpecified }
        return <Tag color={config.color}>{config.text}</Tag>
      },
      width: 100,
    },
  ], [t, language])

  // Data source for transactions/incomes - Extracted from inline JSX
  const transactionsDataSource = useMemo(() => (paymentsWithTreasuryAccounts.length > 0 ? paymentsWithTreasuryAccounts : payments)
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
    ?.map((p: any) => ({ ...p, key: p.id || p.updatedAt || `income-${Date.now()}` })) || [], [paymentsWithTreasuryAccounts, payments])

  // Table columns for expenses - Extracted from inline JSX
  const expensesColumns = useMemo(() => [
    {
      title: t.common.date,
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => moment(date).format('YYYY-MM-DD'),
      width: 120,
    },
    {
      title: t.projectDetails.expenseType || 'Expense Type',
      dataIndex: 'expenseType',
      key: 'expenseType',
      render: (type: string) => {
        const typeMap: Record<string, { color: string; text: string }> = {
          'purchase_order': { color: 'blue', text: t.orders.purchaseOrder || 'Purchase Order' },
          'custody_deduction': { color: 'orange', text: t.projectDetails.custodyDeduction || 'Custody Deduction' },
          'general_expense': { color: 'purple', text: t.projectDetails.generalExpense || 'General Expense' },
        }
        const config = typeMap[type] || { color: 'default', text: type }
        return <Tag color={config.color}>{config.text}</Tag>
      },
      width: 150,
    },
    {
      title: t.projectDetails.itemType || 'Item Type',
      dataIndex: 'itemType',
      key: 'itemType',
      render: (itemType: string) => itemType || '-',
    },
    {
      title: t.common.amount,
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ fontWeight: 'bold', color: '#ff4d4f', fontSize: '16px' }}>
          {formatCurrency(amount || 0, displayCurrency, displayCurrency, language)}
        </span>
      ),
      align: 'right' as const,
      width: 150,
    },
    {
      title: t.projectDetails.engineer || 'Engineer',
      dataIndex: 'engineerName',
      key: 'engineerName',
      render: (name: string) => name || '-',
      width: 150,
    },
    {
      title: t.common.description,
      dataIndex: 'description',
      key: 'description',
    },
  ], [t, language])

  // Data source for expenses - Extracted from inline JSX
  const expensesDataSource = useMemo(() => payments
    .filter((p: any) => {
      // Only show project expenses (not general expenses, not income)
      const isExpense = p.paymentType === 'expense' || (p.paymentType === undefined && !p.contractId)
      const isGeneralExpense = p.isGeneralExpense || (!p.projectId && p.expenseCategory)
      const isIncome = p.paymentType === 'income' || (p.paymentType === undefined && p.contractId)
      return isExpense && !isGeneralExpense && !isIncome && p.projectId === id
    })
    .map((p: any) => ({
      key: p.id || p.updatedAt || `expense-${Date.now()}`,
      date: p.paidDate || p.dueDate,
      expenseType: p.transactionType === 'advance' ? 'custody_deduction' : 
                  p.expenseCategory ? 'general_expense' : 'purchase_order',
      itemType: p.expenseCategory || (t.projectDetails.projectExpense || 'Project Expense'),
      amount: parseFloat(p.amount) || 0,
      engineerName: p.managerName || null,
      description: p.notes || '-',
    })), [payments, id, t])

  // Data source for unified ledger - Extracted from inline JSX
  const ledgerDataSource = useMemo(() => unifiedLedger.map(item => ({ ...item, key: item.id || item.updatedAt || `ledger-${Date.now()}` })), [unifiedLedger])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', 
        minHeight: '300px', 
        flexDirection: 'column' 
      }}>
        <Spin size="large" tip={t.common.loading} />
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description={t.projects.projectNotFound || 'Project not found'} />
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
        {t.projects.backToProjects || 'Back to Projects'}
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
                      <strong>{t.projects.client || 'Client'}:</strong> {project.client.name}
                    </span>
                  </div>
                )}
                {project.startDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined style={{ color: 'white' }} />
                    <span style={{ color: 'white', fontSize: '16px' }}>
                      <strong>{t.projects.startDate || 'Start Date'}:</strong> {moment(project.startDate).format('YYYY-MM-DD')}
                    </span>
                  </div>
                )}
                {project.endDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined style={{ color: 'white' }} />
                    <span style={{ color: 'white', fontSize: '16px' }}>
                      <strong>{t.projects.endDate || 'End Date'}:</strong> {moment(project.endDate).format('YYYY-MM-DD')}
                    </span>
                  </div>
                )}
              </Space>

              {project.notes && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <FileTextOutlined style={{ color: 'white' }} />
                    <strong style={{ color: 'white' }}>{t.common.notes || 'Notes'}:</strong>
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
              title={<span style={{ color: 'white', fontSize: '16px' }}>{t.projectDetails.totalBudget || 'Total Budget'}</span>}
              value={totalBudget}
              prefix={<WalletOutlined style={{ color: 'white' }} />}
              suffix={<span style={{ color: 'white' }}>{getCurrencySymbol(displayCurrency, language)}</span>}
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              {contracts.length > 0 ? (
                <div>{t.projectDetails.mainContract || 'Main Contract'} + {contracts.filter(c => c.contractType === 'amendment').length} {t.projectDetails.amendments || 'Amendments'}</div>
              ) : (
                <div>{t.projectDetails.fromProjectBudget || 'From Project Budget'}</div>
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
              title={<span style={{ color: 'white', fontSize: '16px' }}>{t.projectDetails.totalCollected || 'Total Collected'}</span>}
              value={totalCollected}
              prefix={<InboxOutlined style={{ color: 'white' }} />}
              suffix={<span style={{ color: 'white' }}>{displayCurrency}</span>}
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>{payments.filter(p => (p.paymentType === 'income' || (p.paymentType === undefined && p.contractId)) && p.status === 'paid').length} {t.projectDetails.paidMilestones || 'Paid Milestones'}</div>
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
              title={<span style={{ color: 'white', fontSize: '16px' }}>{t.projectDetails.totalExpenses || 'Total Expenses'}</span>}
              value={totalExpenses}
              prefix={<ShoppingOutlined style={{ color: 'white' }} />}
              suffix={<span style={{ color: 'white' }}>{displayCurrency}</span>}
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>{orders.length} {t.orders.purchaseOrder || 'Purchase Orders'} + {payments.filter(p => (p.paymentType === 'expense' || (p.paymentType === undefined && !p.contractId)) && p.status === 'paid').length} {t.projectDetails.expensePayments || 'Expense Payments'} + {laborGroups.length} {t.labor.laborGroups || 'Labor Groups'}</div>
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
              title={<span style={{ color: 'white', fontSize: '16px' }}>{t.projectDetails.cashFlow || 'Cash Flow'}</span>}
              value={cashFlow}
              prefix={cashFlow >= 0 ? <RiseOutlined style={{ color: 'white' }} /> : <RiseOutlined style={{ color: 'white', transform: 'rotate(180deg)' }} />}
              suffix={<span style={{ color: 'white' }}>{displayCurrency}</span>}
              styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
            />
            <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              <div>{t.projectDetails.margin || 'Margin'}: {profitMargin.toFixed(2)}%</div>
              <div>{t.projectDetails.netMargin || 'Net Margin'}: {formatCurrency(netMargin, displayCurrency, displayCurrency, language)}</div>
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
                title={<span style={{ color: 'white', fontSize: '16px' }}>{t.projectDetails.totalLaborCost || 'Total Labor Cost'}</span>}
                value={calculateTotalLaborCost()}
                prefix={<UserOutlined style={{ color: 'white' }} />}
                suffix={<span style={{ color: 'white' }}>{displayCurrency}</span>}
                styles={{ value: { color: 'white', fontSize: '28px', fontWeight: 'bold' } }}
              />
              <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                <div>{laborGroups.length} {t.projectDetails.paidLaborGroups || 'Paid Labor Groups'}</div>
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
                <Title level={4} style={{ margin: 0 }}>{t.projectDetails.budgetUsage || 'Budget Usage'}</Title>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: getProgressColor(budgetUsagePercent) }}>
                  {budgetUsagePercent.toFixed(1)}%
                </span>
              </div>
              <Progress
                percent={Math.min(100, budgetUsagePercent)}
                strokeColor={getProgressColor(budgetUsagePercent)}
                trailColor="#f0f0f0"
                strokeWidth={20}
                format={() => `${formatCurrency(totalExpenses, displayCurrency, displayCurrency, language)} ${t.common.of || 'of'} ${formatCurrency(totalBudget, displayCurrency, displayCurrency, language)}`}
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
                <strong>{t.projectDetails.used || 'Used'}:</strong> {formatCurrency(totalExpenses)}
              </span>
              <span style={{ color: '#666' }}>
                <strong>{t.projectDetails.available || 'Available'}:</strong> {formatCurrency(remainingBudget)}
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
          columns={transactionsColumns}
          dataSource={transactionsDataSource}
          rowKey={(record) => record.id || record.updatedAt || `income-${Date.now()}`}
          pagination={{ 
            pageSize: 5, 
            showSizeChanger: true, 
            showTotal: (total) => `${t.projectDetails.totalMilestones || 'Total'}: ${total}`
          }}
          locale={{ emptyText: t.projectDetails.noMilestones || 'No milestones registered' }}
        />
      </Card>

      {/* Project Expenses Section */}
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingOutlined />
              <Title level={4} style={{ margin: 0 }}>{t.projectDetails.projectExpenses || 'Project Expenses'}</Title>
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
              {t.projectDetails.addNewExpense || 'Add New Expense'}
            </Button>
          </div>
        }
      >
        <Alert
          message={t.projectDetails.expenseWarning || 'Warning: Expenses entered here are exclusively linked to this project'}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={expensesColumns}
          dataSource={expensesDataSource}
          rowKey={(record) => record.key || `expense-${Date.now()}`}
          pagination={{ 
            pageSize: 10, 
            showSizeChanger: true, 
            showTotal: (total) => `${t.projectDetails.totalExpenses || 'Total'}: ${total}`
          }}
          locale={{ emptyText: t.projectDetails.noExpenses || 'No expenses registered' }}
        />
      </Card>

      {/* Unified Ledger Table */}
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined />
            <Title level={4} style={{ margin: 0 }}>{t.projectDetails.expensesProcurementLedger || 'Expenses & Procurement Ledger'}</Title>
            <span style={{ fontSize: '12px', color: '#999', marginRight: 8 }}>
              ({t.projectDetails.generalExpensesExcluded || 'General expenses excluded'})
            </span>
          </div>
        }
      >
        {unifiedLedger.length === 0 ? (
          <Empty 
            description={t.projectDetails.noTransactions || 'No transactions for this project'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={ledgerColumns}
            dataSource={ledgerDataSource}
            rowKey={(record) => record.id || record.updatedAt || `ledger-${Date.now()}`}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true, 
              showTotal: (total) => `${t.projectDetails.totalTransactions || 'Total'}: ${total}`
            }}
            scroll={{ x: 'max-content' }}
            summary={() => {
              const total = unifiedLedger.reduce((sum, item) => sum + (item.amount || 0), 0)
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} align="right">
                      <strong style={{ fontSize: '16px' }}>{t.common.total || 'Total'}:</strong>
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
            label={formatCurrencyLabel('المبلغ', displayCurrency, language)}
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
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                  onChange={(e) => {
                    if (e.target.value) {
                      form.setFieldsValue({ dueDate: e.target.value })
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t.common.status}
                initialValue="pending"
              >
                <Select>
                  <Option value="pending">{t.common.pending || 'Pending'}</Option>
                  <Option value="paid">{t.common.paid || 'Paid'}</Option>
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
                  label={t.common.paidDate || 'Paid Date'}
                  rules={[{ required: true, message: t.common.selectPaidDate || 'Please select paid date' }]}
                >
                  <input
                    type="date"
                    className="ant-input"
                    style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
                    onChange={(e) => {
                      if (e.target.value) {
                        form.setFieldsValue({ paidDate: e.target.value })
                      }
                    }}
                  />
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
                message.error(t.projectDetails.projectIdNotFound)
                return
              }

              // Handle different expense types
              if (values.expenseType === 'purchase_order') {
                // Link to PO creation - navigate to orders page with project pre-selected
                message.info(t.projectDetails.navigateToOrders)
                navigate(`/orders?projectId=${id}`)
                setExpenseModalVisible(false)
                return
              } else if (values.expenseType === 'general_expense') {
                // Create general expense payment
                if (!values.treasuryAccountId) {
                  message.error(t.projectDetails.selectTreasuryAccount)
                  return
                }

                // CRITICAL: Use branch currency as the single source of truth (no treasury-based currency)
                const currency = displayCurrency;

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
                  treasuryAccountId: values.treasuryAccountId,
                  currency: currency // Include currency from treasury account
                }

                console.log('💾 Saving project expense with currency:', currency);

                const result = await paymentsService.createPayment(expenseData)
                
                if (result.success) {
                  // Create treasury transaction
                  await treasuryService.createTransaction({
                    accountId: values.treasuryAccountId,
                    transactionType: 'outflow',
                    amount: values.amount,
                    referenceType: 'expense',
                    referenceId: result.payment.id,
                    description: `${t.projectDetails.projectExpense}: ${values.description || ''} - ${t.common.project || 'Project'}: ${project?.name || ''}`
                  })

                  message.success(t.projectDetails.expenseCreated)
                  setExpenseModalVisible(false)
                  expenseForm.resetFields()
                  await loadProjectDetails()
                } else {
                  message.error(result.error || t.projectDetails.failedToCreateExpense)
                }
              }
            } catch (error) {
              console.error('Error creating expense:', error)
              message.error(t.projectDetails.errorCreatingExpense)
            }
          }}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="date"
            label="التاريخ"
            rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
            initialValue={moment().format('YYYY-MM-DD')}
          >
            <input
              type="date"
              className="ant-input"
              style={{ width: '100%', padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '32px' }}
              onChange={(e) => {
                if (e.target.value) {
                  expenseForm.setFieldsValue({ date: e.target.value })
                }
              }}
            />
          </Form.Item>

          <Form.Item
            name="expenseType"
            label={t.projectDetails.expenseType || 'Expense Type'}
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
              <Option value="general_expense">مصروف عام</Option>
            </Select>
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
                  <>
                    <Form.Item
                      name="treasuryAccountId"
                      label="الخزينة/الصندوق"
                      rules={[{ required: true, message: 'يرجى اختيار الخزينة/الصندوق' }]}
                    >
                      <Select 
                        placeholder="اختر الخزينة/الصندوق"
                        onChange={(accountId) => {
                          // Note: Currency is now fixed to branch currency, no syncing needed
                          console.log('✅ Treasury account selected:', { accountId, branchCurrency: displayCurrency });
                        }}
                      >
                        {treasuryAccounts.map(acc => (
                          <Option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.type === 'bank' ? 'بنك' : acc.type === 'cash_box' ? 'صندوق' : acc.type})
                            {acc.currency && acc.currency !== displayCurrency ? ` - ${acc.currency}` : ''}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    {/* Currency Display - Static label showing branch currency */}
                    <Form.Item
                      label={`العملة / Currency (${displayCurrency})`}
                      tooltip="العملة مضبوطة على مستوى الفرع ولا يمكن تغييرها لكل معاملة / Currency is set at the branch level and cannot be changed per transaction"
                    >
                      <Input
                        readOnly
                        value={displayCurrency}
                        style={{
                          backgroundColor: '#fafafa',
                          cursor: 'default',
                        }}
                      />
                    </Form.Item>
                  </>
                )
              }
              return null
            }}
          </Form.Item>

          <Form.Item
            name="amount"
            label={formatCurrencyLabel('المبلغ', displayCurrency, language)}
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