'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Radio,
  message,
  Popconfirm,
  Typography,
  Divider,
  Statistic,
  Tabs,
  InputNumber,
  AutoComplete,
  Alert
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BankOutlined,
  SearchOutlined,
  WalletOutlined,
  DollarOutlined,
  UserOutlined,
  LinkOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  FileExcelOutlined
} from '@ant-design/icons'
import paymentsService from '../services/paymentsService'
import projectsService from '../services/projectsService'
import categoryService from '../services/categoryService'
import customersService from '../services/customersService'
import ordersService from '../services/ordersService'
import treasuryService from '../services/treasuryService'
import workersService from '../services/workersService'
import employeesService from '../services/employeesService'
import userManagementService from '../services/userManagementService'
import tenantStore from '../services/tenantStore'
import { useTenant } from '../contexts/TenantContext'
import { useBranch } from '../contexts/BranchContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useSyncStatus } from '../contexts/SyncStatusContext'
import { getTranslations } from '../utils/translations'
import { formatCurrencyWithSymbol, formatCurrencyLabel, getCurrencySymbol } from '../utils/currencyUtils'
import dayjs from 'dayjs'

const { Option } = Select
const { Title } = Typography

type ExpenseType = 'administrative' | 'project' | 'manager_advance'
type TransactionType = 'regular' | 'advance' | 'settlement'

const GeneralExpenses = () => {
  const { industryType } = useTenant()
  const { branchCurrency, branchName } = useBranch() // Get branch currency from context
  const { language } = useLanguage()
  const { updateStatus } = useSyncStatus()
  const t = getTranslations(language)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any>(null)
  const [form] = Form.useForm()
  const [expenseType, setExpenseType] = useState<ExpenseType>('administrative')
  const [transactionType, setTransactionType] = useState<TransactionType>('regular')
  const [projects, setProjects] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState('general')
  const [adminCategories, setAdminCategories] = useState<any[]>([])
  const [projectCategories, setProjectCategories] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerSearchValue, setCustomerSearchValue] = useState('')
  const [customerSearchOptions, setCustomerSearchOptions] = useState<any[]>([])
  const [isNewSupplier, setIsNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [newSupplierEmail, setNewSupplierEmail] = useState('')
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [availableWorkScopes, setAvailableWorkScopes] = useState<any[]>([])
  const [managers, setManagers] = useState<string[]>([])
  const [outstandingAdvances, setOutstandingAdvances] = useState<any[]>([])
  const [pettyCashAdvances, setPettyCashAdvances] = useState<any[]>([])
  const [openAdvances, setOpenAdvances] = useState<any[]>([]) // For settlement dropdown
  const [selectedLinkedAdvance, setSelectedLinkedAdvance] = useState<any>(null) // Selected advance for settlement
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [settlementType, setSettlementType] = useState<string>('expense') // 'expense' or 'return'
  const [settlementPoItems, setSettlementPoItems] = useState<any[]>([]) // Items for settlement PO
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null)
  const [deleteForm] = Form.useForm()
  const [settlementPoVendor, setSettlementPoVendor] = useState<any>(null) // Vendor/Recipient for settlement PO
  const [settlementPoVendorSearch, setSettlementPoVendorSearch] = useState('')
  const [settlementPoVendorOptions, setSettlementPoVendorOptions] = useState<any[]>([])
  const [isSettlementPoNewVendor, setIsSettlementPoNewVendor] = useState(false)
  const [settlementPoNewVendorName, setSettlementPoNewVendorName] = useState('')
  const [settlementPoNewVendorPhone, setSettlementPoNewVendorPhone] = useState('')
  const [settlementPoNewVendorEmail, setSettlementPoNewVendorEmail] = useState('')
  const [settlementAmountExceedsLimit, setSettlementAmountExceedsLimit] = useState(false)
  const [settlementAmountError, setSettlementAmountError] = useState<string | null>(null)
  const [transferModalVisible, setTransferModalVisible] = useState(false)
  const [transferForm] = Form.useForm()
  const [treasuryAccounts, setTreasuryAccounts] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [recipientType, setRecipientType] = useState<'internal' | 'external'>('external')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [externalCustodyName, setExternalCustodyName] = useState('')
  const [externalCustodyPhone, setExternalCustodyPhone] = useState('')
  const [externalCustodyAddress, setExternalCustodyAddress] = useState('')
  const [selectedTreasuryAccount, setSelectedTreasuryAccount] = useState<any>(null)
  // Use branch currency as the single source of truth
  const displayCurrency = branchCurrency || 'SAR'

  const isEngineering = industryType === 'engineering'

  // Calculate settlement total from PO items
  const calculateSettlementTotal = () => {
    if (settlementPoItems.length === 0) {
      return 0
    }
    return settlementPoItems.reduce((sum, item) => sum + (item.total || 0), 0)
  }

  // Update settlement amount validation when items or linked advance changes
  useEffect(() => {
    // Only validate for expense-type settlements with a linked advance
    if (transactionType === 'settlement' && settlementType === 'expense' && selectedLinkedAdvance) {
      let total = calculateSettlementTotal()
      let remainingAmount = selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined 
        ? parseFloat(selectedLinkedAdvance.remainingAmount) 
        : parseFloat(selectedLinkedAdvance.amount || 0)
      
      if (total > remainingAmount && total > 0) {
        setSettlementAmountExceedsLimit(true)
        setSettlementAmountError(t.generalExpenses.amountExceedsAdvance || 'Amount exceeds available advance balance')
      } else {
        setSettlementAmountExceedsLimit(false)
        setSettlementAmountError(null)
      }
      
      // Update form amount field with calculated total (always, even if 0)
      form.setFieldsValue({ amount: total })
    } else if (transactionType !== 'settlement' || settlementType !== 'expense') {
      // Clear validation state when not in expense-type settlement mode
      setSettlementAmountExceedsLimit(false)
      setSettlementAmountError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settlementPoItems, selectedLinkedAdvance, transactionType, settlementType])

  useEffect(() => {
    loadExpenses()
    loadCategories()
    if (isEngineering) {
      loadProjects()
    }
    loadOutstandingAdvances()
    loadTreasuryAccounts()
    loadWorkers()
    loadEmployees()
  }, [industryType])

  const loadWorkers = async () => {
    try {
      const data = await workersService.getActiveWorkers()
      setWorkers(data || [])
    } catch (error) {
      console.error('Error loading workers:', error)
      setWorkers([])
    }
  }

  const loadEmployees = async () => {
    try {
      const data = await employeesService.getEmployees()
      setEmployees(data || [])
      
      if (!data || data.length === 0) {
      }
    } catch (error) {
      console.error('[GeneralExpenses] Error loading employees:', error)
      setEmployees([])
    }
  }

  useEffect(() => {
    if (activeTab === 'petty-cash') {
      loadPettyCashAdvances()
      loadOutstandingAdvances()
      loadOpenAdvances() // Load approved advances for settlement dropdown
    }
  }, [activeTab])

  // Load approved advances for settlement dropdown (including partially_settled with remaining_amount > 0)
  const loadOpenAdvances = async () => {
    try {
      // Get approved and partially_settled advances
      const allAdvances = await paymentsService.getAdvances()
      // Filter to only show advances that can be settled: approved or partially_settled with remaining_amount > 0
      const openAdvances = allAdvances.filter(advance => {
        const status = advance.status
        if (status === 'approved') {
          // Check if remaining_amount > 0 (should be, but double-check)
          const remaining = advance.remainingAmount !== null && advance.remainingAmount !== undefined 
            ? parseFloat(advance.remainingAmount) 
            : parseFloat(advance.amount || 0)
          return remaining > 0
        }
        if (status === 'partially_settled') {
          const remaining = advance.remainingAmount !== null && advance.remainingAmount !== undefined 
            ? parseFloat(advance.remainingAmount) 
            : 0
          return remaining > 0
        }
        return false
      })
      setOpenAdvances(openAdvances)
    } catch (error) {
      console.error('Error loading open advances:', error)
      setOpenAdvances([])
    }
  }

  // Set date field when modal opens for new administrative expenses
  useEffect(() => {
    if (isModalVisible && !editingExpense && expenseType === 'administrative') {
      form.setFieldsValue({ date: dayjs() })
    }
  }, [isModalVisible, editingExpense, expenseType, form])

  const loadCategories = async () => {
    try {
      const [adminCats, projectCats] = await Promise.all([
        categoryService.getAdministrativeCategories(),
        categoryService.getProjectCategories()
      ])
      // Only set categories if they exist and are arrays
      if (Array.isArray(adminCats)) {
        setAdminCategories(adminCats.map(cat => ({ value: cat.name, label: cat.nameAr || cat.name })))
      } else {
        setAdminCategories([])
      }
      if (Array.isArray(projectCats)) {
        setProjectCategories(projectCats.map(cat => ({ value: cat.name, label: cat.nameAr || cat.name })))
      } else {
        setProjectCategories([])
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      // Set empty arrays on error to prevent undefined issues
      setAdminCategories([])
      setProjectCategories([])
    }
  }

  const loadExpenses = async () => {
    setLoading(true)
    updateStatus('loading', language === 'ar' ? 'جاري تحميل المصروفات...' : 'Fetching expenses...', branchName)
    try {
      const expensePayments = await paymentsService.getAllExpenses()

      // Filter out income/revenue records - only show actual expenses
      const filteredExpensePayments = expensePayments.filter(
        (expense) => expense.transactionType !== 'income_project' && expense.transactionType !== 'revenue'
      )

      const expensesWithProjects = await Promise.all(
        filteredExpensePayments.map(async (expense) => {
          let projectName = null
          if (expense.projectId) {
            const project = await projectsService.getProjectById(expense.projectId)
            projectName = project?.name || null
          }
          return {
            ...expense,
            projectName,
            sourceTarget: expense.isGeneralExpense ? 'Admin/Office' : projectName || t.common.notSpecified
          }
        })
      )

      expensesWithProjects.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.createdAt).getTime()
        const dateB = new Date(b.dueDate || b.createdAt).getTime()
        return dateB - dateA
      })

      setExpenses(expensesWithProjects)
      
      if (expensesWithProjects.length === 0) {
        updateStatus('empty', language === 'ar' ? 'لا توجد مصروفات' : 'No expenses found', branchName)
      } else {
        updateStatus('success', language === 'ar' ? `تم تحميل ${expensesWithProjects.length} مصروف` : `Loaded ${expensesWithProjects.length} expenses`, branchName)
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
      const errorMsg = language === 'ar' ? 'تعذر المزامنة مع قاعدة البيانات' : 'Could not sync with the database'
      updateStatus('error', errorMsg, branchName)
      message.error(t.generalExpenses.failedToLoad)
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const projectsList = await projectsService.getProjects()
      setProjects(projectsList || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      setProjects([])
    }
  }

  const loadOutstandingAdvances = async () => {
    try {
      const balances = await paymentsService.getOutstandingAdvancesByManager()
      setOutstandingAdvances(balances)
      
      // Extract unique manager names
      const managerNames = balances.map((b: any) => b.managerName).filter((name: any): name is string => Boolean(name))
      setManagers([...new Set(managerNames)])
    } catch (error) {
      console.error('Error loading outstanding advances:', error)
    }
  }

  const loadPettyCashAdvances = async () => {
    try {
      const advances = await paymentsService.getAdvances()
      setPettyCashAdvances(advances)
    } catch (error) {
      console.error('Error loading petty cash advances:', error)
      setPettyCashAdvances([])
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

  const handleAddExpense = () => {
    setEditingExpense(null)
    setExpenseType('administrative')
    setTransactionType('regular')
    setSelectedProducts([])
    setSelectedCustomer(null)
    setCustomerSearchValue('')
    setIsNewSupplier(false)
    setNewSupplierName('')
    setNewSupplierPhone('')
    setNewSupplierEmail('')
    setSelectedProject(null)
    setAvailableWorkScopes([])
    setShowNewCategoryInput(false)
    setNewCategoryName('')
    setSettlementType('expense')
    setSelectedLinkedAdvance(null)
    setSettlementPoItems([])
    setSettlementPoVendor(null)
    setSettlementPoVendorSearch('')
    setSettlementPoVendorOptions([])
    setIsSettlementPoNewVendor(false)
    setSettlementPoNewVendorName('')
    setSettlementPoNewVendorPhone('')
    setSettlementPoNewVendorEmail('')
    setSettlementAmountExceedsLimit(false)
    setSettlementAmountError(null)
    setRecipientType('external')
    setSelectedWorkerId(null)
    form.resetFields()
    form.setFieldsValue({
      expenseType: 'administrative',
      paymentFrequency: 'one-time',
      transactionType: 'regular',
      quantity: undefined, // Don't set initial value - let placeholder show
      unitPrice: undefined, // Don't set initial value - let placeholder show
      date: dayjs(), // Default to today for administrative expenses
      linkedAdvanceId: undefined, // Clear any previous linkedAdvanceId
      remainingAmount: undefined, // Clear any previous remainingAmount (if it exists)
      recipientType: 'external'
    })
    setIsModalVisible(true)
  }

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense)
    // Determine expense type: manager advance if transactionType is advance, admin if isGeneralExpense, otherwise project
    let expenseTypeValue: ExpenseType = 'administrative'
    if (expense.transactionType === 'advance' || expense.transactionType === 'settlement') {
      expenseTypeValue = 'manager_advance'
    } else if (expense.isGeneralExpense) {
      expenseTypeValue = 'administrative'
    } else {
      expenseTypeValue = 'project'
    }
    
    setExpenseType(expenseTypeValue)
    setTransactionType(expense.transactionType || 'regular')
    setSettlementType(expense.settlementType || 'expense')
    setSelectedCustomer(null)
    setCustomerSearchValue('')
    setIsNewSupplier(false)
    setSelectedProject(null)
    setSelectedLinkedAdvance(null)
    setSettlementPoItems([])
    setSettlementPoVendor(null)
    setSettlementPoVendorSearch('')
    setIsSettlementPoNewVendor(false)
    // For administrative expenses and manager advances, use a single date field
    const expenseDate = expense.dueDate ? dayjs(expense.dueDate) : (expense.paidDate ? dayjs(expense.paidDate) : dayjs())
    
    // Load open advances if editing a settlement
    if (expense.transactionType === 'settlement') {
      loadOpenAdvances().then(() => {
        // Find and set the linked advance
        if (expense.linkedAdvanceId) {
          const linkedAdvance = openAdvances.find(a => a.id === expense.linkedAdvanceId)
          if (linkedAdvance) {
            setSelectedLinkedAdvance(linkedAdvance)
            // Auto-fill project if advance has one
            if (linkedAdvance.projectId) {
              setSelectedProject(linkedAdvance.projectId)
              form.setFieldsValue({ projectId: linkedAdvance.projectId })
            }
          }
        }
      })
    }
    
    // CRITICAL: Determine recipient type using employee_id (relational) first, then fallback to name matching
    // Priority: 1) employee_id (relational), 2) name matching (backward compatibility)
    let recipientEmployee = null
    let recipientWorker = null
    let recipientTypeValue = 'external'
    
    // First, check if expense has employee_id (relational link)
    if (expense.employeeId) {
      recipientEmployee = employees.find(emp => emp.id === expense.employeeId)
      if (recipientEmployee) {
        recipientTypeValue = 'internal'
        setRecipientType('internal')
        setSelectedEmployeeId(recipientEmployee.id)
        setSelectedWorkerId(null)
      }
    } else {
      // Fallback: name matching for backward compatibility with legacy data
      recipientEmployee = expense.recipientName ? employees.find(emp => emp.name === expense.recipientName) : null
      recipientWorker = expense.recipientName ? workers.find(w => w.name === expense.recipientName) : null
      recipientTypeValue = (recipientEmployee || recipientWorker) ? 'internal' : 'external'
      
      if (recipientEmployee) {
        setRecipientType('internal')
        setSelectedEmployeeId(recipientEmployee.id)
        setSelectedWorkerId(null)
      } else if (recipientWorker) {
        setRecipientType('internal')
        setSelectedEmployeeId(null)
        setSelectedWorkerId(recipientWorker.id)
      } else {
        setRecipientType('external')
        setSelectedEmployeeId(null)
        setSelectedWorkerId(null)
      }
    }

    form.setFieldsValue({
      expenseType: expenseTypeValue,
      projectId: expense.projectId || undefined,
      category: expense.expenseCategory || undefined,
      amount: expense.amount,
      date: expenseTypeValue === 'administrative' || expenseTypeValue === 'manager_advance' ? expenseDate : undefined,
      dueDate: expenseTypeValue !== 'administrative' && expenseTypeValue !== 'manager_advance' ? (expense.dueDate ? dayjs(expense.dueDate) : undefined) : undefined,
      paidDate: expenseTypeValue !== 'administrative' && expenseTypeValue !== 'manager_advance' ? (expense.paidDate ? dayjs(expense.paidDate) : undefined) : undefined,
      status: expenseTypeValue === 'administrative' ? (expense.status || 'pending') : (expenseTypeValue === 'manager_advance' && expense.transactionType !== 'settlement' ? (expense.status || 'pending') : undefined),
      paymentMethod: expense.paymentMethod || undefined,
      referenceNumber: expense.referenceNumber || undefined,
      notes: expense.notes || undefined,
      recipientName: expense.recipientName || undefined,
      recipientType: recipientTypeValue,
      employeeId: expense.employeeId || recipientEmployee?.id || undefined, // CRITICAL: Use employee_id from expense first
      recipientWorkerId: recipientWorker?.id || undefined,
      paymentFrequency: expense.paymentFrequency || 'one-time',
      transactionType: expense.transactionType || 'regular',
      managerName: expense.managerName || undefined,
      linkedAdvanceId: expense.linkedAdvanceId || undefined,
      settlementType: expense.settlementType || 'expense'
    })
    setIsModalVisible(true)
  }

  const handleDeleteExpense = async (id: string, password?: string, deletionReason?: string) => {
    try {
      // First, find and reverse any associated treasury transactions
      try {
        const reverseResult = await treasuryService.deleteTransactionByReference('expense', id)
        if (!reverseResult.success && reverseResult.errorCode !== 'FIND_TRANSACTION_FAILED') {
          // Continue with deletion even if reversal fails
        }
      } catch (reverseError) {
        console.error('Error reversing treasury transaction:', reverseError)
        // Continue with deletion even if reversal fails
      }

      // Delete the expense payment with secure deletion protocol
      const result = await paymentsService.deletePayment(id, password, deletionReason)
      if (result.success) {
        message.success(t.generalExpenses.expenseDeleted)
        loadExpenses()
        loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
        if (activeTab === 'petty-cash') {
          loadPettyCashAdvances()
          loadOutstandingAdvances()
        }
      } else {
        message.error(result.error || t.generalExpenses.failedToDelete)
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      message.error(t.generalExpenses.failedToDelete)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      message.error(t.generalExpenses.categoryNameRequired)
      return
    }

    try {
      const result = await categoryService.addCategory({
        name: newCategoryName.trim(),
        type: expenseType,
        createdBy: 'user'
      })

      if (result.success) {
        message.success(t.generalExpenses.categoryAdded)
        setNewCategoryName('')
        setShowNewCategoryInput(false)
        await loadCategories()
        form.setFieldsValue({ category: result.category.name })
      } else {
        message.error(result.error || t.generalExpenses.failedToAddCategory)
      }
    } catch (error) {
      console.error('Error adding category:', error)
      message.error(t.generalExpenses.failedToAddCategory)
    }
  }

  const handleCustomerSearch = async (searchText: string) => {
    setCustomerSearchValue(searchText)
    
    if (!searchText || searchText.trim() === '') {
      setCustomerSearchOptions([])
      setIsNewSupplier(false)
      setSelectedCustomer(null)
      return
    }

    try {
      // STRICT VENDOR FILTERING: Only fetch type = 'vendor' or 'supplier', exclude 'client'
      const searchResults = await customersService.searchCustomers(searchText, 'vendor')
      const options = searchResults.map(customer => ({
        value: customer.id,
        label: `${customer.name} - ${customer.phone}${customer.email ? ` (${customer.email})` : ''}`,
        customer: customer
      }))
      
      const exactMatch = searchResults.find(c => 
        c.name.toLowerCase() === searchText.toLowerCase().trim() ||
        c.phone === searchText.trim()
      )
      
      if (!exactMatch && searchText.trim().length > 0) {
        options.push({
          value: '__NEW__',
          label: `${t.generalExpenses.addNewSupplier}: "${searchText.trim()}"`,
          isNew: true
        })
      }
      
      setCustomerSearchOptions(options)
    } catch (error) {
      console.error('Error searching customers:', error)
      setCustomerSearchOptions([])
    }
  }

  const handleCustomerSelect = (value: string, option: any) => {
    if (value === '__NEW__' || option?.isNew) {
      setIsNewSupplier(true)
      setSelectedCustomer(null)
      const nameFromSearch = customerSearchValue.trim()
      setNewSupplierName(nameFromSearch)
      setNewSupplierPhone('')
      setNewSupplierEmail('')
    } else {
      const customer = option?.customer || customerSearchOptions.find((opt: any) => opt.value === value)?.customer
      if (customer) {
        setSelectedCustomer(customer)
        setIsNewSupplier(false)
        setNewSupplierName('')
        setNewSupplierPhone('')
        setNewSupplierEmail('')
        // Display the customer name in the input field, not the UUID
        setCustomerSearchValue(customer.name)
        form.setFieldsValue({ customerSearch: customer.name })
      }
    }
  }

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId)
    
    // Always set projectId in form
    form.setFieldsValue({ projectId: projectId || undefined })
    
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project && project.workScopes && Array.isArray(project.workScopes) && project.workScopes.length > 0) {
        setAvailableWorkScopes(project.workScopes)
      } else {
        setAvailableWorkScopes([])
      }
      
      // CRITICAL: When project is selected, ensure managerName is preserved
      // If employee is already selected, re-sync managerName to ensure validation passes
      const currentEmployeeId = form.getFieldValue('employeeId')
      if (currentEmployeeId) {
        const employee = employees.find(emp => emp && emp.id === currentEmployeeId)
        if (employee && employee.name) {
          const employeeName = employee.name.trim()
          // Re-set managerName and projectManager to ensure they're not lost
          form.setFieldsValue({
            managerName: employeeName,
            projectManager: employeeName,
            recipientName: employeeName
          })
        }
      }
    } else {
      setAvailableWorkScopes([])
    }
    
    form.setFieldsValue({ workScope: undefined })
  }

  const handleAddItem = () => {
    const itemDescription = form.getFieldValue('itemDescription')
    const quantityValue = form.getFieldValue('quantity')
    const unitPriceValue = form.getFieldValue('unitPrice')
    const quantity = quantityValue !== null && quantityValue !== undefined ? quantityValue : 1
    const unitPrice = unitPriceValue !== null && unitPriceValue !== undefined ? unitPriceValue : 0

    if (!itemDescription || itemDescription.trim() === '') {
      message.error(t.generalExpenses.itemDescriptionRequired)
      return
    }

    if (quantity <= 0) {
      message.error(t.generalExpenses.quantityMustBeGreaterThanZero)
      return
    }

    if (unitPrice < 0) {
      message.error(t.generalExpenses.unitPriceMustBeGreaterThanOrEqualToZero)
      return
    }
    
    const newItem = {
      id: Date.now(),
      productId: null,
      product: itemDescription.trim(),
      price: unitPrice,
      quantity: quantity,
      total: unitPrice * quantity,
      isManualEntry: true
    }
    
    setSelectedProducts([...selectedProducts, newItem])
    form.setFieldsValue({ itemDescription: '', quantity: undefined, unitPrice: undefined })
    message.success(t.generalExpenses.itemAdded)
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...selectedProducts]
    updated.splice(index, 1)
    setSelectedProducts(updated)
  }

  // Settlement PO Vendor Search (similar to customer search)
  // STRICT VENDOR FILTERING: Only fetch type = 'vendor' or 'supplier', exclude 'client'
  const handleSettlementPoVendorSearch = async (searchText: string) => {
    setSettlementPoVendorSearch(searchText)
    
    if (!searchText || searchText.trim() === '') {
      setSettlementPoVendorOptions([])
      setIsSettlementPoNewVendor(false)
      setSettlementPoVendor(null)
      return
    }

    try {
      // STRICT VENDOR FILTERING: Only fetch type = 'vendor' or 'supplier', exclude 'client'
      const searchResults = await customersService.searchCustomers(searchText, 'vendor')
      const options = searchResults.map(customer => ({
        value: customer.id,
        label: `${customer.name} - ${customer.phone}${customer.email ? ` (${customer.email})` : ''}`,
        customer: customer
      }))
      
      const exactMatch = searchResults.find(c => 
        c.name.toLowerCase() === searchText.toLowerCase().trim() ||
        c.phone === searchText.trim()
      )
      
      if (!exactMatch && searchText.trim().length > 0) {
        options.push({
          value: '__NEW__',
          label: `${t.generalExpenses.addNewSupplier}: "${searchText.trim()}"`,
          isNew: true
        })
      }
      
      setSettlementPoVendorOptions(options)
    } catch (error) {
      console.error('Error searching vendors:', error)
      setSettlementPoVendorOptions([])
    }
  }

  const handleSettlementPoVendorSelect = (value: string, option: any) => {
    if (value === '__NEW__' || option?.isNew) {
      setIsSettlementPoNewVendor(true)
      setSettlementPoVendor(null)
      const nameFromSearch = settlementPoVendorSearch.trim()
      setSettlementPoNewVendorName(nameFromSearch)
      setSettlementPoNewVendorPhone('')
      setSettlementPoNewVendorEmail('')
    } else {
      const customer = option?.customer || settlementPoVendorOptions.find((opt: any) => opt.value === value)?.customer
      if (customer) {
        setSettlementPoVendor(customer)
        setIsSettlementPoNewVendor(false)
        setSettlementPoNewVendorName('')
        setSettlementPoNewVendorPhone('')
        setSettlementPoNewVendorEmail('')
        setSettlementPoVendorSearch(customer.name)
        form.setFieldsValue({ settlementPoVendor: customer.name })
      }
    }
  }

  // Settlement PO Item handlers
  const handleAddSettlementPoItem = () => {
    const itemDescription = form.getFieldValue('settlementPoItemDescription')
    const quantity = form.getFieldValue('settlementPoQuantity') || 1
    const unitPrice = form.getFieldValue('settlementPoUnitPrice') || 0

    if (!itemDescription || itemDescription.trim() === '') {
      message.error(t.generalExpenses.itemDescriptionRequired)
      return
    }

    if (quantity <= 0) {
      message.error(t.generalExpenses.quantityMustBeGreaterThanZero)
      return
    }

    if (unitPrice < 0) {
      message.error(t.generalExpenses.unitPriceMustBeGreaterThanOrEqualToZero)
      return
    }
    
    const newItem = {
      id: Date.now(),
      productId: null,
      product: itemDescription.trim(),
      price: unitPrice,
      quantity: quantity,
      total: unitPrice * quantity,
      isManualEntry: true
    }
    
    const updatedItems = [...settlementPoItems, newItem]
    setSettlementPoItems(updatedItems)
    form.setFieldsValue({ settlementPoItemDescription: '', settlementPoQuantity: 1, settlementPoUnitPrice: 0 })
    
    // Calculate and update amount field
    let total = updatedItems.reduce((sum, item) => sum + (item.total || 0), 0)
    form.setFieldsValue({ amount: total })
    message.success(t.generalExpenses.itemAdded)
  }

  const handleRemoveSettlementPoItem = (index: number) => {
    const updated = [...settlementPoItems]
    updated.splice(index, 1)
    setSettlementPoItems(updated)
    
    // Calculate and update amount field
    let total = updated.reduce((sum, item) => sum + (item.total || 0), 0)
    form.setFieldsValue({ amount: total })
  }

  const handleSubmit = async (values: any) => {
    try {
      const isAdmin = expenseType === 'administrative'
      const isProjectExpense = expenseType === 'project'
      const isManagerAdvance = expenseType === 'manager_advance'
      
      // For project expenses, use ONLY ordersService (same as OrdersPage) - NO paymentsService
      if (isProjectExpense) {
        if (selectedProducts.length === 0) {
          message.error(t.generalExpenses.addAtLeastOneItem)
          return
        }

        // Handle supplier/customer - same logic as OrdersPage
        let finalCustomerId = null
        let finalCustomerName = ''
        let finalCustomerPhone = ''
        let finalCustomerEmail = ''

        if (isNewSupplier) {
          const supplierName = newSupplierName.trim() || customerSearchValue.trim()
          if (!supplierName) {
            message.error(t.generalExpenses.supplierNameRequired)
            return
          }

          const newSupplierData = {
            name: supplierName,
            phone: newSupplierPhone.trim() || null,
            email: newSupplierEmail.trim() || null,
            type: 'supplier',
            status: 'active'
          }

          const createResult = await customersService.addCustomer(newSupplierData)
          if (createResult.success) {
            finalCustomerId = createResult.customer.id
            finalCustomerName = createResult.customer.name
            finalCustomerPhone = createResult.customer.phone || ''
            finalCustomerEmail = createResult.customer.email || ''
            message.success(t.generalExpenses.supplierAddedSuccessfully)
          } else {
            message.error(createResult.error || t.generalExpenses.failedToAddSupplier)
            return
          }
        } else if (selectedCustomer) {
          finalCustomerId = selectedCustomer.id
          finalCustomerName = selectedCustomer.name
          finalCustomerPhone = selectedCustomer.phone || ''
          finalCustomerEmail = selectedCustomer.email || ''
        } else {
          message.error(t.generalExpenses.selectOrAddSupplier)
          return
        }

        // Validate project selection for engineering mode
        if (isEngineering && !values.projectId) {
          message.error(t.generalExpenses.selectProjectRequired)
          return
        }

        // Validate treasury account selection
        if (!values.treasuryAccountId) {
          message.error(t.generalExpenses.selectTreasuryAccountRequired)
          return
        }

        // Derive payment method from treasury account type
        const selectedAccount = treasuryAccounts.find(acc => acc.id === values.treasuryAccountId)
        if (!selectedAccount) {
          message.error(t.generalExpenses.treasuryAccountNotFound)
          return
        }
        // Map account type to payment method: 'bank' -> 'bank_transfer', 'cash_box' -> 'cash'
        const derivedPaymentMethod = selectedAccount.type === 'bank' ? 'bank_transfer' : 'cash'

        // Create order for project expense - EXACT same as OrdersPage
        const orderItems = selectedProducts.map(p => ({
          productId: p.productId || null,
          productName: p.product,
          quantity: p.quantity,
          unitPrice: p.price,
          total: p.total,
          isManualEntry: p.isManualEntry || false
        }))

        // GLOBAL FIX: Inject branch_id for non-super admins if missing
        const userProfile = await userManagementService.getCurrentUserProfile()
        const isSuperAdmin = userProfile?.role === 'super_admin'
        
        const orderData = {
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          customerPhone: finalCustomerPhone,
          customerEmail: finalCustomerEmail,
          projectId: isEngineering ? (values.projectId || null) : null,
          workScope: isEngineering ? (values.workScope || null) : null,
          items: orderItems,
          status: values.status || 'pending',
          paymentMethod: derivedPaymentMethod,
          shippingAddress: '',
          shippingMethod: 'standard',
          notes: values.notes || '',
          createdBy: 'user'
        }
        
        // Inject branch_id if missing for non-super admins
        if (!isSuperAdmin && userProfile?.branch_id && !orderData.branch_id) {
          orderData.branch_id = userProfile.branch_id
        }

        const orderResult = await ordersService.createOrder(orderData)
        
        if (orderResult.success) {
          message.success(t.generalExpenses.orderAddedSuccessfully)
          
          // Update treasury if account selected - must succeed
          if (values.treasuryAccountId && orderResult.order?.id) {
            try {
              // Use order total (includes tax and discount) instead of items total
              const totalAmount = parseFloat(orderResult.order.total) || 0
              
              if (totalAmount <= 0) {
                message.warning(t.generalExpenses.zeroOrNegativeAmountWarning)
              } else {
                const treasuryResult = await treasuryService.createTransaction({
                  accountId: values.treasuryAccountId,
                  transactionType: 'outflow',
                  amount: totalAmount,
                  referenceType: 'order',
                  referenceId: orderResult.order.id,
                  description: `${t.generalExpenses.purchaseOrderDescription}: ${finalCustomerName} - ${values.notes || ''}`
                })
                
                if (treasuryResult.success) {
                  const currencySymbol = getCurrencySymbol(displayCurrency, language)
                  message.success(`${t.generalExpenses.amountDeductedFromTreasury} ${totalAmount.toLocaleString()} ${currencySymbol} (${treasuryResult.accountName || t.common.notSpecified})`)
                  loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
                } else {
                  console.error('❌ GeneralExpenses: Failed to update treasury for project expense:', treasuryResult.error)
                  message.error({
                    content: `${t.generalExpenses.failedToDeductFromTreasury}: ${treasuryResult.error || t.generalExpenses.unknownError}`,
                    duration: 10,
                    style: { marginTop: '10vh' }
                  })
                }
              }
            } catch (error) {
              console.error('❌ GeneralExpenses: Exception during treasury update for project expense:', error)
              message.error({
                content: `${t.generalExpenses.errorDeductingFromTreasury}: ${error.message || t.generalExpenses.unknownError}`,
                duration: 10,
                style: { marginTop: '10vh' }
              })
            }
          }
          
          setIsModalVisible(false)
          form.resetFields()
          setSelectedProducts([])
          setSelectedCustomer(null)
          setCustomerSearchValue('')
          setIsNewSupplier(false)
          setNewSupplierName('')
          setNewSupplierPhone('')
          setNewSupplierEmail('')
          setSelectedProject(null)
          setAvailableWorkScopes([])
          loadExpenses()
        } else {
          message.error(orderResult.error || t.generalExpenses.failedToCreateOrder)
        }

        return
      }

      // For Manager Advance expenses
      if (isManagerAdvance) {
        // For settlement, manager name comes from the linked advance, so skip validation
        if (transactionType !== 'settlement') {
          // CRITICAL: Enhanced validation - check multiple potential field names
          const managerName = values.managerName || values.projectManager || null
          const employeeId = values.employeeId || null
          
          // If project is selected, managerName becomes required
          if (values.projectId && !managerName) {
            message.error(t.generalExpenses.selectEmployeeRequired)
            return
          }
          
          // If employee is selected but managerName is missing, try to recover from employeeId
          if (employeeId && !managerName) {
            const employee = employees.find(emp => emp && emp.id === employeeId)
            if (employee && employee.name) {
              // Auto-recover managerName from employee
              values.managerName = employee.name.trim()
            } else {
              message.error(t.generalExpenses.verifyEmployeeSelection)
              return
            }
          }
          
          // Final check: if no managerName and no employeeId, show error
          if (!managerName && !employeeId) {
            message.error(t.generalExpenses.enterManagerNameOrSelectEmployee)
            return
          }
        }
        
        // Validate amount <= remaining amount (not original amount)
        // Use 'let' instead of 'const' because amountValue may be reassigned for expense-type settlements
        // CRITICAL: Parse amount to ensure large numbers are handled correctly
        let amountValue = typeof values.amount === 'string' 
          ? parseFloat(values.amount.replace(/,/g, '')) 
          : (typeof values.amount === 'number' ? values.amount : parseFloat(values.amount) || 0);
        
        // For non-settlement advances, validate amount and treasury account immediately
        // For settlements, validation happens later (expense-type: from PO items, return-type: after checking remaining amount)
        if (transactionType !== 'settlement') {
          if (!values.amount || isNaN(amountValue) || amountValue <= 0) {
            message.error(t.generalExpenses.enterValidAmount)
            return
          }
          
          // Validate treasury account for advances - ensure it's not empty string or null
          const treasuryAccountId = values.treasuryAccountId?.trim() || null
          if (!treasuryAccountId || treasuryAccountId === '') {
            message.error(t.generalExpenses.selectTreasuryAccountRequired)
            return
          }
        }
        
        // For settlement, validate linked advance and prepare PO data
        if (transactionType === 'settlement') {
          if (!values.linkedAdvanceId) {
            message.error(t.generalExpenses.selectOpenAdvance)
            return
          }

          if (!selectedLinkedAdvance) {
            message.error(t.generalExpenses.linkedAdvanceDetailsNotFound)
            return
          }

          // For expense-type settlements, calculate amount from PO items and validate
          if (settlementType === 'expense') {
            if (!selectedLinkedAdvance.projectId) {
              message.error(t.generalExpenses.linkedAdvanceNoProject)
              return
            }

            // Validate vendor/recipient
            if (!settlementPoVendor && !isSettlementPoNewVendor) {
              message.error(t.generalExpenses.selectOrAddVendorForPO)
              return
            }

            // Validate PO items
            if (settlementPoItems.length === 0) {
              message.error(t.generalExpenses.addAtLeastOneItemForPO)
              return
            }

            // Calculate amount from PO items for expense-type settlements
            let calculatedAmount = calculateSettlementTotal()
            if (calculatedAmount <= 0) {
              message.error(t.generalExpenses.itemTotalMustBeGreaterThanZero)
              return
            }

            // Validate calculated amount against remaining amount
            // NOTE: This validation ONLY runs for settlements (transactionType === 'settlement')
            // For new advances or administrative expenses, this validation is skipped
            let remainingAmount = selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined 
              ? parseFloat(selectedLinkedAdvance.remainingAmount) 
              : parseFloat(selectedLinkedAdvance.amount || 0)

            if (remainingAmount <= 0) {
              message.error(t.generalExpenses.advanceFullySettled)
              return
            }

            if (calculatedAmount > remainingAmount) {
              message.error(t.generalExpenses.amountExceedsAvailableBalance)
              return
            }

            // Use calculated amount instead of form value
            amountValue = calculatedAmount

            // Handle vendor creation if new
            let finalVendorId = null
            let finalVendorName = ''
            let finalVendorPhone = ''
            let finalVendorEmail = ''

            if (isSettlementPoNewVendor) {
              const vendorName = settlementPoNewVendorName.trim() || settlementPoVendorSearch.trim()
              if (!vendorName) {
                message.error(t.generalExpenses.enterVendorRecipientName)
                return
              }

              const newVendorData = {
                name: vendorName,
                phone: settlementPoNewVendorPhone.trim() || null,
                email: settlementPoNewVendorEmail.trim() || null,
                type: 'supplier',
                status: 'active'
              }

              const createResult = await customersService.addCustomer(newVendorData)
              if (createResult.success) {
                finalVendorId = createResult.customer.id
                finalVendorName = createResult.customer.name
                finalVendorPhone = createResult.customer.phone || ''
                finalVendorEmail = createResult.customer.email || ''
                message.success(t.generalExpenses.supplierAddedSuccessfully)
              } else {
                message.error(createResult.error || t.generalExpenses.failedToAddSupplier)
                return
              }
            } else if (settlementPoVendor) {
              finalVendorId = settlementPoVendor.id
              finalVendorName = settlementPoVendor.name
              finalVendorPhone = settlementPoVendor.phone || ''
              finalVendorEmail = settlementPoVendor.email || ''
            }

            // Prepare PO data
            const poItems = settlementPoItems.map(p => ({
              productId: p.productId || null,
              productName: p.product,
              quantity: p.quantity,
              unitPrice: p.price,
              total: p.total,
              isManualEntry: p.isManualEntry || false
            }))

            // Use paymentsService.createSettlementWithPO for dual-save
            const expenseDate = values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')

            // Get manager name from linked advance
            const managerName = selectedLinkedAdvance.managerName

            // For expense-type settlements, do NOT require treasury account
            // The money already left the bank when the advance was first issued
            // No treasury transaction should be created for expense-type settlements

            // CRITICAL: Use branch currency as the single source of truth
            const currencyForSettlement = displayCurrency

            const result = await paymentsService.createSettlementWithPO({
              linkedAdvanceId: values.linkedAdvanceId,
              amount: amountValue,
              date: expenseDate,
              paymentMethod: 'settlement', // Force to 'settlement' - payment method is hidden for settlements
              referenceNumber: values.referenceNumber?.trim() || null,
              notes: values.notes || null,
              settlementType: settlementType || 'expense',
              managerName: managerName,
              projectId: selectedLinkedAdvance.projectId,
              workScope: values.workScope || null,
              treasuryAccountId: null, // Expense-type settlements don't use treasury account
              currency: currencyForSettlement, // Currency from linked advance
              // PO data
              vendorId: finalVendorId,
              vendorName: finalVendorName,
              vendorPhone: finalVendorPhone,
              vendorEmail: finalVendorEmail,
              poItems: poItems,
              poStatus: 'completed', // Settlement PO is immediately completed
              poPaymentMethod: 'cash' // Default, but payment is already made from advance
            })

            if (result.success) {
              message.success(t.generalExpenses.settlementAndPOSaved)
              
              // DO NOT create treasury transaction for expense-type settlements
              // The money already left the bank when the advance was first issued
              // Only record the expense in Project Ledger and update Advance status
              
              setIsModalVisible(false)
              form.resetFields()
              setSelectedProducts([])
              setEditingExpense(null)
              setTransactionType('advance')
              setSettlementType('expense')
              setSelectedLinkedAdvance(null)
              setSettlementPoItems([])
              setSettlementPoVendor(null)
              setSettlementPoVendorSearch('')
              setIsSettlementPoNewVendor(false)
              loadExpenses()
              loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
              if (activeTab === 'petty-cash') {
                loadPettyCashAdvances()
                loadOutstandingAdvances()
                loadOpenAdvances() // Reload open advances after creating settlement
              }
            } else {
              console.error('Settlement with PO save failed:', {
                success: result.success,
                error: result.error,
                errorCode: result.errorCode,
                fullResult: result
              })
              message.error(result.error || t.generalExpenses.failedToSaveSettlementAndPO)
            }
            return
          } else {
            // For return-type settlements, validate manually entered amount
            // NOTE: This validation ONLY runs for settlements (transactionType === 'settlement')
            // For new advances or administrative expenses, this validation is skipped
            // Re-parse amountValue from form for return-type settlements
            amountValue = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount)
            if (!values.amount || isNaN(amountValue) || amountValue <= 0) {
              message.error(t.generalExpenses.enterValidAmount)
              return
            }
            
            // Validate treasury account for return-type settlements - ensure it's not empty string or null
            const treasuryAccountId = values.treasuryAccountId?.trim() || null
            if (!treasuryAccountId || treasuryAccountId === '') {
              message.error(t.generalExpenses.selectTreasuryAccountForReturn)
              return
            }
            
            const remainingAmount = selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined 
              ? parseFloat(selectedLinkedAdvance.remainingAmount) 
              : parseFloat(selectedLinkedAdvance.amount || 0)

            if (remainingAmount <= 0) {
              message.error(t.generalExpenses.advanceFullySettled)
              return
            }

            if (amountValue > remainingAmount) {
              message.error(t.generalExpenses.amountExceedsAvailableBalance)
              return
            }
          }
        }

        // Regular advance (no PO creation, no settlement validation needed)
        // For new advances: Skip remaining_amount validation, remaining_amount will be set equal to amount in the service
        // For administrative expenses: No remaining_amount validation needed
        if (transactionType !== 'settlement') {
          const amountValueCheck = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount)
          if (!values.amount || isNaN(amountValueCheck) || amountValueCheck <= 0) {
            message.error(t.generalExpenses.enterValidAmount)
            return
          }
          // Note: For new advances, remaining_amount validation is skipped.
          // The service will set remaining_amount = amount for new advances.
        }

        // Auto-generate reference number for new advances
        let referenceNumber = values.referenceNumber?.trim() || null
        if (!referenceNumber && !editingExpense && transactionType === 'advance') {
          referenceNumber = await paymentsService.generateAdvanceReferenceNumber()
        }

        // For settlement, get manager name from linked advance and validate remaining amount
        // CRITICAL: Use multiple potential field names to ensure we get the manager name
        let managerName = values.managerName || values.projectManager || null
        if (transactionType === 'settlement' && values.linkedAdvanceId) {
          const linkedAdvance = selectedLinkedAdvance || openAdvances.find(a => a.id === values.linkedAdvanceId)
          if (linkedAdvance) {
            managerName = linkedAdvance.managerName
            // For return-type settlements, we still need to update remaining_amount
            // This will be handled in the service, but we need to ensure the advance exists
          }
        } else if (!managerName && values.employeeId) {
          // Fallback: If managerName is missing but employeeId exists, recover from employee
          const employee = employees.find(emp => emp && emp.id === values.employeeId)
          if (employee && employee.name) {
            managerName = employee.name.trim()
          }
        }

        const expenseDate = values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')

        // For advances, derive payment method from treasury account type
        let derivedPaymentMethod = null
        if (transactionType === 'settlement') {
          derivedPaymentMethod = 'settlement' // Force 'settlement' for settlements
        } else {
          // For advances, derive from treasury account
          const treasuryAccountId = values.treasuryAccountId?.trim() || null
          if (treasuryAccountId) {
            const selectedAccount = treasuryAccounts.find(acc => acc.id === treasuryAccountId)
            if (selectedAccount) {
              // Map account type to payment method: 'bank' -> 'bank_transfer', 'cash_box' -> 'cash'
              derivedPaymentMethod = selectedAccount.type === 'bank' ? 'bank_transfer' : 'cash'
            }
          }
        }

        // CRITICAL: Use branch currency as the single source of truth (no treasury-based currency)
        const currencyForAdvance = displayCurrency
        
        // GLOBAL FIX: Inject branch_id for non-super admins if missing
        const userProfile = await userManagementService.getCurrentUserProfile()
        const isSuperAdmin = userProfile?.role === 'super_admin'

        const paymentData = {
          isGeneralExpense: true, // Manager advances are general expenses
          projectId: values.projectId || null, // Optional project_id
          workScope: null,
          category: null, // No category for manager advances
          amount: amountValue,
          dueDate: expenseDate, // Use single date field
          paidDate: expenseDate, // Same as dueDate for manager advances
          status: editingExpense ? values.status : 'pending', // Default to pending for new entries, use existing for edits
          paymentMethod: derivedPaymentMethod === 'cash' ? 'Cash' : derivedPaymentMethod, // Derive from treasury account or use 'settlement'
          referenceNumber: referenceNumber,
          notes: values.notes || null,
          paymentFrequency: null, // No frequency for manager advances
          transactionType: transactionType,
          managerName: managerName,
          linkedAdvanceId: transactionType === 'settlement' ? (values.linkedAdvanceId || null) : null,
          settlementType: transactionType === 'settlement' ? (settlementType || 'expense') : null,
          currency: currencyForAdvance, // Currency from treasury account or linked advance
          treasuryAccountId: treasuryAccountIdForAdvance // Include treasury account ID for advances
        }
        
        // Inject branch_id if missing for non-super admins
        if (!isSuperAdmin && userProfile?.branch_id && !paymentData.branch_id) {
          paymentData.branch_id = userProfile.branch_id
        }

        let result
        if (editingExpense) {
          result = await paymentsService.updatePayment(editingExpense.id, paymentData)
        } else {
          result = await paymentsService.createPayment(paymentData)
        }

        if (result.success) {
          // CRITICAL: Treasury transactions are now created ONLY when status changes to 'approved' via updatePaymentStatus
          // Do NOT create treasury transaction here for pending advances - it will be created when admin approves (status -> 'approved')
          if (transactionType === 'settlement') {
            message.success(t.generalExpenses.settlementSaved)
          } else if (result.payment?.status === 'pending') {
            message.success(t.generalExpenses.advanceRequestSaved)
          } else {
            message.success(t.generalExpenses.advanceSaved)
          }
          
          // Create treasury transaction for return-type settlements - ensure it's not empty string or null
          const treasuryAccountIdForReturn = values.treasuryAccountId?.trim() || null
          if (transactionType === 'settlement' && settlementType === 'return' && treasuryAccountIdForReturn && treasuryAccountIdForReturn !== '' && result.payment?.id) {
            try {
              const treasuryResult = await treasuryService.createTransaction({
                accountId: treasuryAccountIdForReturn,
                transactionType: 'inflow', // Return/deposit back to treasury
                amount: amountValue,
                referenceType: 'expense',
                referenceId: result.payment.id,
                description: `${t.generalExpenses.settlementReturnDescription}: ${selectedLinkedAdvance?.referenceNumber || selectedLinkedAdvance?.paymentNumber || ''} - ${values.notes || ''}`
              })
              
              if (!treasuryResult.success) {
                console.error('GeneralExpenses: Failed to update treasury for return settlement:', treasuryResult.error)
                // Don't show error to user - settlement is already saved
              }
            } catch (error) {
              console.error('GeneralExpenses: Error updating treasury for return settlement:', error)
              // Don't show error to user - settlement is already saved
            }
          }
          
          setIsModalVisible(false)
          form.resetFields()
          setSelectedProducts([])
          setEditingExpense(null)
          setTransactionType('advance')
          loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
          setSettlementType('expense')
          setSelectedLinkedAdvance(null)
          setSettlementPoItems([])
          setSettlementPoVendor(null)
          setSettlementPoVendorSearch('')
          setIsSettlementPoNewVendor(false)
          loadExpenses()
          if (activeTab === 'petty-cash') {
            loadPettyCashAdvances()
            loadOutstandingAdvances()
            loadOpenAdvances() // Reload open advances after creating settlement
          }
        } else {
          console.error('Manager advance save failed:', {
            success: result.success,
            error: result.error,
            errorCode: result.errorCode,
            fullResult: result
          })
          message.error(result.error || t.generalExpenses.failedToSaveExpense)
        }
        return
      }

      // For Administrative expenses
      if (isAdmin) {
        if (!values.category) {
          message.error(t.generalExpenses.selectCategory)
          return
        }
        // CRITICAL: Parse amount to ensure large numbers are handled correctly
        // InputNumber parser removes commas, but we need to ensure it's a number
        let amountValue = typeof values.amount === 'string' 
          ? parseFloat(values.amount.replace(/,/g, '')) 
          : (typeof values.amount === 'number' ? values.amount : parseFloat(values.amount) || 0);
        if (!values.amount || isNaN(amountValue) || amountValue <= 0) {
          message.error(t.generalExpenses.enterValidAmount)
          return
        }
        if (!values.paymentFrequency) {
          message.error(t.generalExpenses.selectPaymentFrequency)
          return
        }
        // Validate treasury account for administrative expenses - ensure it's not empty string or null
        const treasuryAccountId = values.treasuryAccountId?.trim() || null
        if (!treasuryAccountId || treasuryAccountId === '') {
          message.error(t.generalExpenses.selectTreasuryAccountRequired)
          return
        }

        // Derive payment method from treasury account type
        const selectedAccount = treasuryAccounts.find(acc => acc.id === treasuryAccountId)
        if (!selectedAccount) {
          message.error(t.generalExpenses.treasuryAccountNotFound)
          return
        }
        // Map account type to payment method: 'bank' -> 'bank_transfer', 'cash_box' -> 'cash'
        const derivedPaymentMethod = selectedAccount.type === 'bank' ? 'bank_transfer' : 'cash'

        // Generate auto-reference number if empty (EXP-001, EXP-002, etc.)
        let referenceNumber = values.referenceNumber?.trim() || null
        if (!referenceNumber && !editingExpense) {
          referenceNumber = await paymentsService.generateExpenseReferenceNumber()
        }

        const expenseDate = values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')

        // CRITICAL: Validate employee_id is required for internal recipients
        if (values.recipientType === 'internal' && !values.employeeId) {
          message.error(t.generalExpenses.selectEmployeeRequired || 'Please select an employee for internal recipient')
          return
        }

        // Get recipient name based on type
        let recipientName = null
        let employeeId = null
        if (values.recipientType === 'internal' && values.employeeId) {
          const selectedEmployee = employees.find(emp => emp.id === values.employeeId)
          if (!selectedEmployee) {
            message.error(t.generalExpenses.employeeNotFound || 'Selected employee not found')
            return
          }
          recipientName = selectedEmployee.name
          employeeId = values.employeeId // CRITICAL: Save employee_id for relational linking
        } else if (values.recipientType === 'external' && values.recipientName) {
          recipientName = values.recipientName
          employeeId = null // External recipients have no employee_id
        }

        // Prepare payment data for administrative expense
        // Note: The 'category' field here maps to 'expense_category' in the database via paymentsService
        // The 'recipientName' field maps to 'recipient_name' in the database (for display/backward compatibility)
        // The 'employeeId' field maps to 'employee_id' in the database (for relational linking)
        // CRITICAL: Use values.status if provided, otherwise default to 'pending'
        const expenseStatus = values.status || (editingExpense ? editingExpense.status : 'pending')
        // CRITICAL: Use branch currency as the single source of truth (no treasury-based currency)
        const currencyForAdmin = displayCurrency

        // GLOBAL FIX: Inject branch_id for non-super admins if missing
        let fetchedUserProfile = userProfile
        let fetchedIsSuperAdmin = isSuperAdmin
        if (!fetchedUserProfile) {
          fetchedUserProfile = await userManagementService.getCurrentUserProfile()
          fetchedIsSuperAdmin = fetchedUserProfile?.role === 'super_admin'
        }
        
        const paymentData = {
          isGeneralExpense: true,
          projectId: null,
          workScope: null,
          category: values.category, // Maps to expense_category in DB via paymentsService
          amount: amountValue,
          dueDate: expenseDate,
          paidDate: expenseStatus === 'paid' ? expenseDate : null, // Set paidDate if status is paid
          status: expenseStatus, // Use form value or default to 'pending'
          paymentMethod: derivedPaymentMethod === 'cash' ? 'Cash' : derivedPaymentMethod,
          referenceNumber: referenceNumber,
          notes: values.notes || null,
          recipientName: recipientName, // Maps to recipient_name in DB (for display/backward compatibility)
          employeeId: employeeId, // CRITICAL: Relational link to employees table
          paymentFrequency: values.paymentFrequency || 'one-time',
          transactionType: 'regular',
          managerName: null,
          linkedAdvanceId: null,
          currency: currencyForAdmin, // Currency from treasury account
          treasuryAccountId: treasuryAccountId // Include treasury account ID
        }
        
        // Inject branch_id if missing for non-super admins
        if (!isSuperAdmin && userProfile?.branch_id && !paymentData.branch_id) {
          paymentData.branch_id = userProfile.branch_id
        }

        let result
        if (editingExpense) {
          result = await paymentsService.updatePayment(editingExpense.id, paymentData)
        } else {
          result = await paymentsService.createPayment(paymentData)
        }

        if (result.success) {
          // CRITICAL: Create treasury transaction immediately if expense is created with status 'paid'
          // If status is 'pending', treasury transaction will be created when admin approves via updatePaymentStatus
          const finalStatus = result.payment?.status || expenseStatus
          
          if (finalStatus === 'paid' && treasuryAccountId && result.payment?.id) {
            try {
              const treasuryResult = await treasuryService.createTransaction({
                accountId: treasuryAccountId,
                transactionType: 'outflow',
                amount: amountValue,
                referenceType: 'expense',
                referenceId: result.payment.id,
                description: `General Expense: ${values.category || ''} - ${values.notes || ''}`
              })
              
              if (treasuryResult.success) {
                message.success(`${t.generalExpenses.expenseSaved || 'Expense saved'}. ${t.generalExpenses.amountDeductedFromTreasury || 'Amount deducted from treasury'}`)
                loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
              } else {
                // CRITICAL: Treasury transaction failed - notify user and suggest manual review
                console.error('❌ GeneralExpenses: Failed to create treasury transaction for paid expense:', {
                  error: treasuryResult.error,
                  errorCode: treasuryResult.errorCode,
                  expenseId: result.payment.id,
                  accountId: treasuryAccountId,
                  amount: amountValue
                })
                message.error(
                  `${t.generalExpenses.expenseSaved || 'Expense saved'} but ${t.generalExpenses.failedToDeductFromTreasury || 'failed to deduct from treasury'}. ` +
                  `Please review expense ID: ${result.payment.id.substring(0, 8)}... and manually process the treasury transaction if needed.`
                )
                // Keep the expense but user is aware it needs manual treasury processing
              }
            } catch (error) {
              // CRITICAL: Exception during treasury transaction - expense is saved but treasury not updated
              console.error('❌ GeneralExpenses: Exception during treasury transaction creation for paid expense:', {
                error,
                expenseId: result.payment.id,
                accountId: treasuryAccountId,
                amount: amountValue
              })
              message.error(
                `${t.generalExpenses.expenseSaved || 'Expense saved'} but ${t.generalExpenses.errorDeductingFromTreasury || 'error updating treasury'}. ` +
                `Please review expense ID: ${result.payment.id.substring(0, 8)}... and manually process the treasury transaction if needed.`
              )
            }
          } else if (finalStatus === 'pending') {
            message.success(t.generalExpenses.expenseRequestSaved || 'Expense request saved')
          } else {
            message.success(t.generalExpenses.expenseSaved || 'Expense saved')
          }
          
          setIsModalVisible(false)
          form.resetFields()
          setSelectedProducts([])
          setEditingExpense(null)
          loadExpenses()
          loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
        } else {
          const errorMsg = result.error || result.errorCode || t.generalExpenses.failedToSaveExpense
          console.error('Payment save failed:', {
            success: result.success,
            error: result.error,
            errorCode: result.errorCode,
            fullResult: result
          })
          message.error(errorMsg)
        }
      }
    } catch (error: any) {
      console.error('Error saving expense:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })
      const errorMessage = error?.message || error?.details || t.generalExpenses.failedToSaveExpense
      message.error(`${t.generalExpenses.saveError}: ${errorMessage}`)
    }
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingExpense(null)
    setSelectedProducts([])
    setSelectedCustomer(null)
    setCustomerSearchValue('')
    setIsNewSupplier(false)
    setShowNewCategoryInput(false)
    setNewCategoryName('')
    setExpenseType('administrative')
    setTransactionType('regular')
    setSettlementType('expense')
    setSelectedLinkedAdvance(null)
    setSettlementPoItems([])
    setSettlementPoVendor(null)
    setSettlementPoVendorSearch('')
    setIsSettlementPoNewVendor(false)
    setSettlementAmountExceedsLimit(false)
    setSettlementAmountError(null)
    setRecipientType('external')
    setSelectedWorkerId(null)
    // Reset form with default values
    form.setFieldsValue({
      expenseType: 'administrative',
      paymentFrequency: 'one-time',
      transactionType: 'regular',
      quantity: undefined, // Don't set initial value - let placeholder show
      unitPrice: undefined, // Don't set initial value - let placeholder show
      date: dayjs(), // Reset date to today for administrative expenses
      recipientType: 'external'
    })
  }

  const handlePrintVoucher = (expense: any) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      message.error(t.generalExpenses.allowPopupsForPrinting)
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <title>${language === 'ar' ? 'سند صرف' : 'Payment Voucher'} - ${expense.paymentNumber || expense.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .details {
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
          }
          .label {
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${language === 'ar' ? 'سند صرف' : 'Payment Voucher'}</h1>
        </div>
        <div class="details">
          <div class="detail-row">
            <span class="label">${language === 'ar' ? 'رقم السند:' : 'Voucher Number:'}</span>
            <span>${expense.paymentNumber || expense.id}</span>
          </div>
          <div class="detail-row">
            <span class="label">${language === 'ar' ? 'التاريخ:' : 'Date:'}</span>
            <span>${expense.dueDate ? dayjs(expense.dueDate).format('YYYY-MM-DD') : '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">${language === 'ar' ? 'المبلغ:' : 'Amount:'}</span>
            <span>${parseFloat(expense.amount || 0).toLocaleString()} ${displayCurrency}</span>
          </div>
          <div class="detail-row">
            <span class="label">${language === 'ar' ? 'المستلم:' : 'Recipient:'}</span>
            <span>${expense.recipientName || '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">${language === 'ar' ? 'الفئة:' : 'Category:'}</span>
            <span>${expense.expenseCategory || '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">${language === 'ar' ? 'الوصف:' : 'Description:'}</span>
            <span>${expense.notes || '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">${language === 'ar' ? 'طريقة الدفع:' : 'Payment Method:'}</span>
            <span>${expense.paymentMethod || '-'}</span>
          </div>
        </div>
        <div class="footer">
          <p>${language === 'ar' ? 'تم الطباعة في:' : 'Printed on:'} ${dayjs().format('YYYY-MM-DD HH:mm')}</p>
        </div>
      </body>
      </html>
    `
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      message.error(t.generalExpenses.allowPopupsForPrinting)
      return
    }

    const tableRows = filteredExpenses.map(expense => `
      <tr>
        <td>${expense.paymentNumber || expense.id}</td>
        <td>${expense.dueDate ? dayjs(expense.dueDate).format('YYYY-MM-DD') : '-'}</td>
        <td>${expense.recipientName || '-'}</td>
        <td>${expense.expenseCategory || '-'}</td>
        <td>${parseFloat(expense.amount || 0).toLocaleString()} ${getCurrencySymbol(displayCurrency, language)}</td>
        <td>${expense.notes || '-'}</td>
      </tr>
    `).join('')

    const printContent = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
        <meta charset="UTF-8">
        <title>${language === 'ar' ? 'تقرير المصاريف العامة' : 'General Expenses Report'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: right;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${language === 'ar' ? 'تقرير المصاريف العامة' : 'General Expenses Report'}</h1>
        </div>
        <table>
          <thead>
            <tr>
              <th>${language === 'ar' ? 'رقم المصروف' : 'Expense Number'}</th>
              <th>${language === 'ar' ? 'التاريخ' : 'Date'}</th>
              <th>${language === 'ar' ? 'المستلم' : 'Recipient'}</th>
              <th>${language === 'ar' ? 'الفئة' : 'Category'}</th>
              <th>${language === 'ar' ? 'المبلغ' : 'Amount'}</th>
              <th>${language === 'ar' ? 'الوصف' : 'Description'}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <p>${language === 'ar' ? 'إجمالي المصاريف:' : 'Total Expenses:'} ${totalExpenses.toLocaleString()} ${getCurrencySymbol(displayCurrency, language)}</p>
          <p>${language === 'ar' ? 'تم الطباعة في:' : 'Printed on:'} ${dayjs().format('YYYY-MM-DD HH:mm')}</p>
        </div>
      </body>
      </html>
    `
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const handleExportExcel = () => {
    // Create CSV content
    const headers = language === 'ar' 
      ? ['رقم المصروف', 'التاريخ', 'المستلم', 'الفئة', 'المبلغ', 'الوصف', 'الحالة']
      : ['Expense Number', 'Date', 'Recipient', 'Category', 'Amount', 'Description', 'Status']
    const rows = filteredExpenses.map(expense => [
      expense.paymentNumber || expense.id,
      expense.dueDate ? dayjs(expense.dueDate).format('YYYY-MM-DD') : '',
      expense.recipientName || '',
      expense.expenseCategory || '',
      parseFloat(expense.amount || 0).toLocaleString(),
      expense.notes || '',
      expense.status || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Add BOM for UTF-8
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${language === 'ar' ? 'المصاريف_العامة' : 'General_Expenses'}_${dayjs().format('YYYY-MM-DD')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    message.success(language === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully')
  }

  // Calculate statistics
  let totalExpenses = expenses.filter(e => e.transactionType !== 'advance' && e.transactionType !== 'settlement').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  let paidExpenses = expenses.filter(e => e.status === 'paid' && e.transactionType !== 'advance' && e.transactionType !== 'settlement').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  let pendingExpenses = expenses.filter(e => e.status === 'pending' && e.transactionType !== 'advance' && e.transactionType !== 'settlement').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  // Filter expenses based on search
  const filteredExpenses = expenses.filter((expense) => {
    if (activeTab === 'petty-cash' && expense.transactionType !== 'advance' && expense.transactionType !== 'settlement') {
      return false
    }
    if (activeTab === 'general' && (expense.transactionType === 'advance' || expense.transactionType === 'settlement')) {
      return false
    }
    const searchLower = searchText.toLowerCase()
    return (
      expense.paymentNumber?.toLowerCase().includes(searchLower) ||
      expense.sourceTarget?.toLowerCase().includes(searchLower) ||
      expense.expenseCategory?.toLowerCase().includes(searchLower) ||
      expense.notes?.toLowerCase().includes(searchLower) ||
      expense.managerName?.toLowerCase().includes(searchLower)
    )
  })

  const columns = useMemo(() => [
    {
      title: t.generalExpenses.expenseNumber || 'Expense Number',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      width: 150
    },
    {
      title: t.generalExpenses.sourceTarget || 'Source/Target',
      dataIndex: 'sourceTarget',
      key: 'sourceTarget',
      width: 200,
      render: (text: string, record: any) => (
        <Tag color={record.isGeneralExpense ? 'blue' : 'green'}>
          {text}
        </Tag>
      )
    },
    ...(activeTab === 'petty-cash' ? [{
      title: t.generalExpenses.managerEngineer || 'Manager/Engineer',
      dataIndex: 'managerName',
      key: 'managerName',
      width: 150,
      render: (manager: string, record: any) => {
        // CRITICAL FIX: Always show manager name even if balance is 0
        // Get manager name from record, or try to get it from linked advance for settlements
        const managerName = manager || record.managerName || (record.transactionType === 'settlement' && record.linkedAdvanceId ? 
          (pettyCashAdvances.find(a => a.id === record.linkedAdvanceId)?.managerName) : null)
        
        if (managerName) {
          return <Tag color="purple">{managerName}</Tag>
        }
        // For settlements, try to get from linked advance
        if (record.transactionType === 'settlement' && record.linkedAdvanceId) {
          const linkedAdvance = pettyCashAdvances.find(a => a.id === record.linkedAdvanceId)
          if (linkedAdvance && linkedAdvance.managerName) {
            return <Tag color="purple">{linkedAdvance.managerName}</Tag>
          }
        }
        return <span style={{ color: '#999' }}>-</span>
      }
    }] : []),
    {
      title: t.generalExpenses.expenseType || 'Expense Type',
      dataIndex: 'isGeneralExpense',
      key: 'isGeneralExpense',
      width: 120,
      render: (isGeneral: boolean, record: any) => {
        if (record.transactionType === 'advance') {
          return <Tag color="orange">{t.generalExpenses.advance || 'Advance'}</Tag>
        }
        if (record.transactionType === 'settlement') {
          return <Tag color="cyan">{t.generalExpenses.settlement || 'Settlement'}</Tag>
        }
        return (
          <Tag color={isGeneral ? 'orange' : 'cyan'}>
            {isGeneral ? (t.generalExpenses.administrativeExpense || 'Administrative Expense') : (t.generalExpenses.projectExpense || 'Project Expense')}
          </Tag>
        )
      }
    },
    {
      title: t.generalExpenses.expenseCategory,
      dataIndex: 'expenseCategory',
      key: 'expenseCategory',
      width: 150,
      render: (category: string) => category ? <Tag>{category}</Tag> : '-'
    },
    {
      title: t.generalExpenses.recipient || 'Recipient',
      dataIndex: 'recipientName',
      key: 'recipientName',
      width: 150,
      render: (name: string, record: any) => {
        // CRITICAL: Relational display - lookup employee name from employees list using employee_id
        // If employee_id exists, use the current name from employees list (allows name updates)
        if (record.employeeId) {
          const employee = employees.find(emp => emp.id === record.employeeId)
          if (employee) {
            return <Tag color="blue">{employee.name}</Tag>
          }
        }
        // Fallback to saved recipientName for external recipients or legacy data
        return name ? <Tag color="blue">{name}</Tag> : '-'
      }
    },
    {
      title: t.generalExpenses.amount,
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => {
        const currencySymbol = getCurrencySymbol(displayCurrency, language)
        return `${parseFloat(amount || 0).toLocaleString()} ${currencySymbol}`
      },
      sorter: (a: any, b: any) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0)
    },
    {
      title: t.common.date,
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string, record: any) => {
        // For manager advances, use dueDate as the single date field
        if (record.transactionType === 'advance' || record.transactionType === 'settlement') {
          return date ? dayjs(date).format('YYYY-MM-DD') : '-'
        }
        // For other expenses, show both dates if available
        return date ? dayjs(date).format('YYYY-MM-DD') : '-'
      }
    },
    {
      title: t.common.status,
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: any) => {
        // Manager advances use: pending, approved, rejected, settled, partially_settled
        if (record.transactionType === 'advance' || record.transactionType === 'settlement') {
          const statusConfig: Record<string, { color: string; label: string }> = {
            pending: { color: 'warning', label: t.generalExpenses.pendingReview || 'Pending Review' },
            approved: { color: 'success', label: t.generalExpenses.approved || 'Approved' },
            rejected: { color: 'error', label: t.generalExpenses.rejected || 'Rejected' },
            settled: { color: 'success', label: t.generalExpenses.settled || 'Settled' },
            partially_settled: { color: 'processing', label: t.generalExpenses.partiallySettled || 'Partially Settled' }
          }
          const config = statusConfig[status] || { color: 'default', label: status }
          return <Tag color={config.color}>{config.label}</Tag>
        }
        // Other expenses use: paid, pending, overdue, cancelled
        const statusConfig: Record<string, { color: string; label: string }> = {
          paid: { color: 'success', label: t.generalExpenses.paid || 'Paid' },
          pending: { color: 'warning', label: t.generalExpenses.pending || 'Pending' },
          overdue: { color: 'error', label: t.generalExpenses.overdue || 'Overdue' },
          cancelled: { color: 'default', label: t.generalExpenses.cancelled || 'Cancelled' }
        }
        const config = statusConfig[status] || { color: 'default', label: status }
        return <Tag color={config.color}>{config.label}</Tag>
      }
    },
    {
      title: t.generalExpenses.paymentMethod || 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const methods: Record<string, string> = {
          cash: t.generalExpenses.cash || 'Cash',
          bank_transfer: t.generalExpenses.bankTransfer || 'Bank Transfer',
          check: t.generalExpenses.check || 'Check',
          other: t.generalExpenses.other || 'Other'
        }
        return method ? methods[method] || method : '-'
      }
    },
    {
      title: t.common.notes,
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true
    },
    {
      title: t.common.actions,
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        // Don't allow editing if status is 'approved' for manager advances
        const isApproved = (record.transactionType === 'advance' || record.transactionType === 'settlement') && record.status === 'approved'
        
        return (
          <Space>
            <Button
              type="link"
              icon={<PrinterOutlined />}
              onClick={() => handlePrintVoucher(record)}
              size="small"
              title={t.generalExpenses.printVoucher || 'Print Voucher'}
            >
              {t.common.print || 'Print'}
            </Button>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditExpense(record)}
              size="small"
              disabled={isApproved}
              title={isApproved ? (t.generalExpenses.cannotEditApprovedAdvance || 'Cannot edit approved advance') : undefined}
            >
              {t.common.edit}
            </Button>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={isApproved}
              title={isApproved ? (t.generalExpenses.cannotDeleteApprovedAdvance || 'Cannot delete approved advance') : undefined}
              onClick={() => {
                setExpenseToDelete(record)
                setDeleteModalVisible(true)
              }}
            >
              {t.common.delete}
            </Button>
          </Space>
        )
      }
    }
  ], [t, language, activeTab, pettyCashAdvances])

  // Petty Cash Columns
  const pettyCashColumns = useMemo(() => [
    ...columns.slice(0, 3), // Payment number, source, manager
    {
      title: t.generalExpenses.transactionType || 'Transaction Type',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 120,
      render: (type: string, record: any) => {
        if (type === 'advance') {
          return <Tag color="orange">{t.generalExpenses.issueAdvance || 'Issue Advance'}</Tag>
        }
        if (type === 'settlement') {
          return <Tag color="cyan">{t.generalExpenses.settlement || 'Settlement'}</Tag>
        }
        return <Tag>{t.generalExpenses.normal || 'Normal'}</Tag>
      }
    },
    {
      title: t.generalExpenses.amount,
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => {
        const currencySymbol = getCurrencySymbol(displayCurrency, language)
        return `${parseFloat(amount || 0).toLocaleString()} ${currencySymbol}`
      },
      sorter: (a: any, b: any) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0)
    },
    {
      title: t.generalExpenses.remainingAmountColumn || 'Remaining Amount',
      dataIndex: 'remainingAmount',
      key: 'remainingAmount',
      width: 150,
      render: (remaining: number | null, record: any) => {
        // Only show for advances, not settlements
        if (record.transactionType === 'advance') {
          const remainingAmount = remaining !== null && remaining !== undefined ? parseFloat(remaining) : parseFloat(record.amount || 0)
          const originalAmount = parseFloat(record.amount || 0)
          const color = remainingAmount <= 0 ? 'success' : remainingAmount < originalAmount ? 'warning' : 'default'
          return (
            <Tag color={color}>
              {remainingAmount.toLocaleString()} {getCurrencySymbol(displayCurrency, language)}
            </Tag>
          )
        }
        return '-'
      },
      sorter: (a: any, b: any) => {
        const aRemaining = a.transactionType === 'advance' ? (parseFloat(a.remainingAmount) || parseFloat(a.amount || 0)) : 0
        const bRemaining = b.transactionType === 'advance' ? (parseFloat(b.remainingAmount) || parseFloat(b.amount || 0)) : 0
        return aRemaining - bRemaining
      }
    },
    {
      title: t.common.date,
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: t.common.status,
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: any) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
          pending: { color: 'warning', label: t.generalExpenses.pendingReview || 'Pending Review' },
          approved: { color: 'success', label: t.generalExpenses.approved || 'Approved' },
          rejected: { color: 'error', label: t.generalExpenses.rejected || 'Rejected' },
          settled: { color: 'success', label: t.generalExpenses.settled || 'Settled' },
          partially_settled: { color: 'processing', label: t.generalExpenses.partiallySettled || 'Partially Settled' }
        }
        const config = statusConfig[status] || { color: 'default', label: status }
        return <Tag color={config.color}>{config.label}</Tag>
      }
    },
    {
      title: t.generalExpenses.paymentMethod || 'Payment Method',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const methods: Record<string, string> = {
          cash: t.generalExpenses.cash || 'Cash',
          bank_transfer: t.generalExpenses.bankTransfer || 'Bank Transfer',
          check: t.generalExpenses.check || 'Check',
          other: t.generalExpenses.other || 'Other'
        }
        return method ? methods[method] || method : '-'
      }
    },
    {
      title: t.generalExpenses.projectName || 'Project Name',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 200,
      render: (projectName: string | null, record: any) => {
        if (projectName) {
          return <Tag color="green">{projectName}</Tag>
        }
        return <span style={{ color: '#999' }}>-</span>
      }
    },
    {
      title: t.generalExpenses.linkedAdvanceColumn || 'Linked Advance',
      dataIndex: 'linkedAdvanceId',
      key: 'linkedAdvanceId',
      width: 150,
      render: (linkedId: string, record: any) => {
        if (record.transactionType === 'settlement' && linkedId) {
          const advance = pettyCashAdvances.find(a => a.id === linkedId)
          return advance ? (
            <Tag color="blue">
              {advance.referenceNumber || advance.paymentNumber} - {advance.amount} {getCurrencySymbol(displayCurrency, language)}
            </Tag>
          ) : (
            <Tag>{linkedId.substring(0, 8)}...</Tag>
          )
        }
        return '-'
      }
    },
    {
      title: t.generalExpenses.transferredFromColumn || 'Transferred From',
      dataIndex: 'sourceAdvanceId',
      key: 'sourceAdvanceId',
      width: 150,
      render: (sourceId: string | null, record: any) => {
        // Show transfer link for advances that were transferred (have sourceAdvanceId)
        if (record.transactionType === 'advance' && sourceId) {
          const sourceAdvance = pettyCashAdvances.find(a => a.id === sourceId)
          if (sourceAdvance) {
            return (
              <Tag color="orange">
                ${t.generalExpenses.transferredFrom || 'Transferred From'}: {sourceAdvance.referenceNumber || sourceAdvance.paymentNumber}
              </Tag>
            )
          }
          // If source advance not found in current list, show truncated ID
          return (
            <Tag color="orange">
              ${t.generalExpenses.transferredFrom || 'Transferred From'}: {sourceId.substring(0, 8)}...
            </Tag>
          )
        }
        return '-'
      }
    },
    {
      title: t.common.notes,
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true
    },
    columns[columns.length - 1] // Actions column
  ], [t, language, columns, pettyCashAdvances, employees]) // CRITICAL: Include employees for relational display

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            <BankOutlined style={{ marginLeft: 8 }} />
            {t.generalExpenses.title}
          </Title>
          <Space>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handlePrintAll}
              size="large"
            >
              {t.generalExpenses.printAllPDF || 'Print All PDF'}
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              size="large"
            >
              {t.generalExpenses.exportExcel || 'Export Excel'}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddExpense}
              size="large"
            >
              {t.generalExpenses.addNewExpense || t.generalExpenses.newExpense}
            </Button>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={t.generalExpenses.totalExpensesLabel || t.generalExpenses.totalExpenses}
                value={totalExpenses}
                precision={0}
                suffix={displayCurrency}
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={t.generalExpenses.paidExpenses || 'Paid Expenses'}
                value={paidExpenses}
                precision={0}
                suffix={displayCurrency}
                styles={{ value: { color: '#3f8600' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={t.generalExpenses.pendingExpenses || 'Pending Expenses'}
                value={pendingExpenses}
                precision={0}
                suffix={displayCurrency}
                styles={{ value: { color: '#cf1322' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* Outstanding Advances Summary for Petty Cash Tab */}
        {activeTab === 'petty-cash' && outstandingAdvances.length > 0 && (
          <Card style={{ marginBottom: 24, backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              <WalletOutlined style={{ marginLeft: 8 }} />
              {t.generalExpenses.outstandingAdvancesTotal || 'Outstanding Advances Total'}
            </Title>
            <Row gutter={16}>
              {outstandingAdvances.map((balance, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card size="small">
                    <Statistic
                      title={`${balance.managerName || t.common.notSpecified}`}
                      value={balance.outstandingBalance}
                      precision={0}
                      suffix={getCurrencySymbol(displayCurrency, language)}
                      styles={{ value: { color: balance.outstandingBalance > 0 ? '#cf1322' : '#3f8600' } }}
                      prefix={<UserOutlined />}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      {balance.advanceCount} {t.generalExpenses.advances || 'Advances'} | {balance.totalSettled.toLocaleString()} {getCurrencySymbol(displayCurrency, language)} {t.generalExpenses.settled || 'Settled'}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'general',
              label: (
                <span>
                  <BankOutlined />
                  {t.generalExpenses.generalExpensesTab || t.generalExpenses.title}
                </span>
              ),
              children: (
                <>
                  {/* Search */}
                  <Input
                    placeholder={t.generalExpenses.searchExpensePlaceholder}
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ marginBottom: 16, maxWidth: 400 }}
                    allowClear
                  />

                  {/* Table */}
                  <Table
                    columns={columns}
                    dataSource={filteredExpenses.map((e, idx) => ({ ...e, key: e.id || idx }))}
                    loading={loading}
                    scroll={{ x: 1500 }}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `${t.generalExpenses.totalExpensesLabel || 'Total'}: ${total}`
                    }}
                    locale={{
                      emptyText: loading ? t.common.loading : (t.generalExpenses.noExpenses || 'No expenses')
                    }}
                    virtual={false}
                    sticky={true}
                  />
                </>
              )
            },
            {
              key: 'petty-cash',
              label: (
                <span>
                  <WalletOutlined />
                  {t.generalExpenses.pettyCashTab || 'Petty Cash'}
                </span>
              ),
              children: (
                <>
                  {/* Search */}
                  <Input
                    placeholder={t.generalExpenses.searchAdvanceSettlement || 'Search advance or settlement...'}
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ marginBottom: 16, maxWidth: 400 }}
                    allowClear
                  />

                  {/* Table */}
                  <Table
                    columns={pettyCashColumns}
                    dataSource={filteredExpenses.map((e, idx) => ({ ...e, key: e.id || e.updatedAt || idx }))}
                    loading={loading}
                    scroll={{ x: 1700 }}
                    rowKey={(record) => record.id || record.updatedAt || `expense-${Date.now()}`}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `${t.generalExpenses.total || 'Total'}: ${total} ${t.generalExpenses.transactions || 'transactions'}`
                    }}
                    virtual={false}
                    sticky={true}
                    locale={{
                      emptyText: loading ? t.common.loading : (t.generalExpenses.noAdvancesSettlements || 'No advances or settlements')
                    }}
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingExpense ? (t.generalExpenses.editExpense) : (t.generalExpenses.addNewExpense || t.generalExpenses.newExpense)}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="expenseType"
            label={t.generalExpenses.expenseTypeLabel || 'Type of Expense'}
            rules={[{ required: true, message: t.generalExpenses.selectExpenseType || 'Please select expense type' }]}
          >
            <Radio.Group
              value={expenseType}
              onChange={(e) => {
                setExpenseType(e.target.value)
                const isAdmin = e.target.value === 'administrative'
                const isManagerAdvance = e.target.value === 'manager_advance'
                form.setFieldsValue({ 
                  projectId: undefined, 
                  category: undefined, 
                  workScope: undefined,
                  paymentFrequency: isAdmin ? 'one-time' : undefined,
                  paymentMethod: undefined,
                  managerName: undefined,
                  amount: undefined,
                  date: isAdmin || isManagerAdvance ? dayjs() : undefined, // Reset date to today for admin expenses and manager advances
                  dueDate: undefined,
                  paidDate: undefined,
                  transactionType: isManagerAdvance ? 'advance' : 'regular',
                  status: isManagerAdvance ? 'pending' : undefined
                })
                if (isManagerAdvance) {
                  setTransactionType('advance')
                  loadOpenAdvances()
                }
                setSelectedProducts([])
                setSelectedCustomer(null)
                setCustomerSearchValue('')
                setIsNewSupplier(false)
              }}
              buttonStyle="solid"
              size="large"
              style={{ width: '100%' }}
            >
              <Radio.Button value="administrative" style={{ flex: 1, textAlign: 'center' }}>
                <Space>
                  <BankOutlined />
                  {t.generalExpenses.administrative || 'Administrative'}
                </Space>
              </Radio.Button>
              <Radio.Button value="project" style={{ flex: 1, textAlign: 'center' }}>
                <Space>
                  <LinkOutlined />
                  {t.generalExpenses.projectRelated || 'Project Related'}
                </Space>
              </Radio.Button>
              <Radio.Button value="manager_advance" style={{ flex: 1, textAlign: 'center' }}>
                <Space>
                  <WalletOutlined />
                  {t.generalExpenses.managerAdvance || 'Manager Advance'}
                </Space>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Manager Advance Form: عهدة مدير المشروع */}
          {expenseType === 'manager_advance' && (
            <>
              <Form.Item
                name="transactionType"
                label={t.generalExpenses.transactionTypeLabel || 'Transaction Type'}
                rules={[{ required: true, message: t.generalExpenses.selectTransactionType || 'Please select transaction type' }]}
                initialValue="advance"
              >
                <Radio.Group
                  value={transactionType}
                  onChange={(e) => {
                    setTransactionType(e.target.value)
                    if (e.target.value !== 'settlement') {
                      form.setFieldsValue({ linkedAdvanceId: undefined, managerName: undefined })
                      loadOpenAdvances() // Reload when switching back
                    } else {
                      loadOpenAdvances() // Load approved advances for settlement
                    }
                  }}
                  buttonStyle="solid"
                  size="large"
                >
                  <Radio.Button value="advance">{t.generalExpenses.issueAdvanceButton || t.generalExpenses.issueAdvance || 'Issue Advance'}</Radio.Button>
                  <Radio.Button value="settlement">{t.generalExpenses.settlementButton || t.generalExpenses.settlement || 'Settlement'}</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {/* Manager Name - Hidden for settlement, shown for advance */}
              {transactionType !== 'settlement' && (
                <>
                  <Form.Item
                    name="custodyType"
                    label={t.generalExpenses.custodyTypeLabel || 'Custody Type'}
                    rules={[{ required: true, message: t.generalExpenses.selectCustodyType || 'Please select custody type' }]}
                    initialValue="external"
                  >
                    <Radio.Group
                      value={recipientType}
                      onChange={(e) => {
                        setRecipientType(e.target.value)
                        // Reset fields when switching types
                        form.setFieldsValue({ 
                          managerName: undefined,
                          employeeId: undefined
                        })
                        setSelectedEmployeeId(null)
                        setExternalCustodyName('')
                        setExternalCustodyPhone('')
                        setExternalCustodyAddress('')
                      }}
                      buttonStyle="solid"
                      size="large"
                    >
                      <Radio.Button value="internal">{t.generalExpenses.internalEmployee || 'Internal (Employee)'}</Radio.Button>
                      <Radio.Button value="external">{t.generalExpenses.externalVendor || 'External (Vendor/Representative)'}</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {recipientType === 'internal' ? (
                    <>
                      {/* Hidden Form.Item for managerName to ensure validation works correctly */}
                      <Form.Item
                        name="managerName"
                        hidden
                        rules={[
                          {
                            validator: (_, value) => {
                              // If project is selected, managerName becomes required
                              const projectId = form.getFieldValue('projectId')
                              if (projectId && !value) {
                                return Promise.reject(new Error(t.generalExpenses.selectEmployeeRequired))
                              }
                              // If employee is selected, managerName should be set
                              const employeeId = form.getFieldValue('employeeId')
                              if (employeeId && !value) {
                                return Promise.reject(new Error(t.generalExpenses.verifyEmployeeSelection))
                              }
                              return Promise.resolve()
                            }
                          }
                        ]}
                      >
                        <Input type="hidden" />
                      </Form.Item>
                      
                      <Form.Item
                        name="employeeId"
                        label={t.generalExpenses.employeeLabel || 'Employee'}
                        rules={[{ required: true, message: t.generalExpenses.selectEmployeeRequired || 'Please select employee' }]}
                      >
                        <Select
                          placeholder={t.generalExpenses.selectEmployee || 'Select Employee'}
                          showSearch
                          value={selectedEmployeeId}
                          onChange={(value) => {
                            // Step 1: Capture the selected ID
                            if (!value) {
                              setSelectedEmployeeId(null)
                              // Clear all related fields when deselecting
                              form.setFieldsValue({ 
                                managerName: undefined,
                                recipientName: undefined,
                                employeeId: undefined,
                                projectManager: undefined // Clear potential projectManager field
                              })
                              return
                            }
                            
                            // Update state immediately for UI consistency
                            setSelectedEmployeeId(value)
                            
                            // Step 2: Find the corresponding employee object in the data source
                            // Fail-safe: Verify employees array is populated
                            if (!employees || employees.length === 0) {
                              return
                            }
                            
                            const employee = employees.find(emp => emp && emp.id === value)
                            
                            // Step 3: Fail-safe logic - if found, populate form fields
                            if (employee && employee.name) {
                              const employeeName = employee.name.trim()
                              
                              if (!employeeName) {
                                return
                              }
                              
                              // Step 4: Execute form.setFieldsValue to populate ALL potential field names synchronously
                              // This ensures the form state is updated before any validation runs
                              // CRITICAL: Set managerName, recipientName, AND projectManager to cover all backend expectations
                              form.setFieldsValue({ 
                                managerName: employeeName,
                                recipientName: employeeName,
                                employeeId: value,
                                projectManager: employeeName // Set projectManager in case backend expects this field when project is linked
                              })
                              
                              // Force form validation to run after setting values
                              // This ensures validation passes immediately after selection
                              setTimeout(() => {
                                form.validateFields(['managerName', 'employeeId']).catch(() => {
                                  // Validation errors will be shown by Form.Item
                                })
                              }, 0)
                              
                              // Update managers list for future reference
                              if (employeeName && !managers.includes(employeeName)) {
                                setManagers([...new Set([...managers, employeeName])])
                              }
                            }
                          }}
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          size="large"
                        >
                          {employees.map(emp => (
                            <Option key={emp.id} value={emp.id} label={emp.name}>
                              {emp.name} - {emp.jobTitle || t.common.employee || 'Employee'}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </>
                  ) : (
                    <>
                      <Form.Item
                        name="managerName"
                        label={t.generalExpenses.vendorRepresentativeName || 'Vendor/Representative Name'}
                        rules={[{ required: true, message: t.generalExpenses.enterVendorRepresentativeName || 'Please enter vendor/representative name' }]}
                      >
                        <Input
                          placeholder={t.generalExpenses.enterVendorRepresentativeName || 'Enter vendor/representative name'}
                          value={externalCustodyName}
                          onChange={(e) => {
                            const value = e.target.value
                            setExternalCustodyName(value)
                            form.setFieldsValue({ managerName: value })
                            if (value.trim() && !managers.includes(value.trim())) {
                              setManagers([...new Set([...managers, value.trim()])])
                            }
                          }}
                          size="large"
                        />
                      </Form.Item>
                      <Form.Item
                        name="externalCustodyPhone"
                        label={t.common.phone}
                        rules={[{ required: true, message: t.common.phoneRequired || 'Please enter phone number' }]}
                      >
                        <Input
                          placeholder={t.common.enterPhone || 'Enter phone number'}
                          value={externalCustodyPhone}
                          onChange={(e) => setExternalCustodyPhone(e.target.value)}
                          size="large"
                        />
                      </Form.Item>
                      <Form.Item
                        name="externalCustodyAddress"
                        label={`${t.common.address} (${t.common.optional})`}
                      >
                        <Input.TextArea
                          placeholder={t.common.enterAddress || 'Enter address'}
                          value={externalCustodyAddress}
                          onChange={(e) => setExternalCustodyAddress(e.target.value)}
                          rows={2}
                        />
                      </Form.Item>
                    </>
                  )}
                </>
              )}

              {/* Settlement: Open Advance Dropdown */}
              {transactionType === 'settlement' && (
                <>
                  <Form.Item
                    name="linkedAdvanceId"
                    label={t.generalExpenses.openAdvance || 'Open Advance'}
                    rules={[{ required: true, message: t.generalExpenses.selectOpenAdvance }]}
                  >
                    <Select
                      placeholder={t.generalExpenses.selectOpenAdvanceApproved || 'Select open advance (approved only)'}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      size="large"
                      onChange={(value) => {
                        const selectedAdvance = openAdvances.find(a => a.id === value)
                        if (selectedAdvance) {
                          setSelectedLinkedAdvance(selectedAdvance)
                          form.setFieldsValue({ managerName: selectedAdvance.managerName })
                          // Auto-fill project if advance has one
                          if (selectedAdvance.projectId) {
                            setSelectedProject(selectedAdvance.projectId)
                            form.setFieldsValue({ projectId: selectedAdvance.projectId })
                            // Load work scopes if project has them
                            if (selectedAdvance.projectId) {
                              projectsService.getProjectById(selectedAdvance.projectId).then((project) => {
                                if (project && project.workScopes && Array.isArray(project.workScopes) && project.workScopes.length > 0) {
                                  setAvailableWorkScopes(project.workScopes)
                                } else {
                                  setAvailableWorkScopes([])
                                }
                              }).catch(() => setAvailableWorkScopes([]))
                            }
                          }
                        }
                      }}
                    >
                      {openAdvances.map((advance) => {
                        const remainingAmount = advance.remainingAmount !== null && advance.remainingAmount !== undefined 
                          ? parseFloat(advance.remainingAmount) 
                          : parseFloat(advance.amount || 0)
                        const originalAmount = parseFloat(advance.amount || 0)
                        return (
                          <Option key={advance.id} value={advance.id}>
                            {advance.referenceNumber || advance.paymentNumber} - {advance.managerName} - ${t.generalExpenses.originalAmount || 'Original Amount'}: {originalAmount.toLocaleString()} ${getCurrencySymbol(displayCurrency, language)} - ${t.generalExpenses.remaining || 'Remaining'}: {remainingAmount.toLocaleString()} ${getCurrencySymbol(displayCurrency, language)} ({dayjs(advance.dueDate || advance.createdAt).format('YYYY-MM-DD')})
                          </Option>
                        )
                      })}
                    </Select>
                  </Form.Item>

                  {/* Display linked advance info */}
                  {selectedLinkedAdvance && (
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f9ff', border: '1px solid #91d5ff' }}>
                      <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#1890ff' }}>
                        {t.generalExpenses.linkedAdvanceDetails || 'Linked Advance Details'}:
                      </div>
                      <div>{t.generalExpenses.originalAmount || 'Original Amount'}: <strong>{parseFloat(selectedLinkedAdvance.amount || 0).toLocaleString()} {language === 'ar' ? 'ر.س' : (displayCurrency || 'SAR')}</strong></div>
                      <div>{t.generalExpenses.remainingAmountColumn || 'Remaining Amount'}: <strong style={{ color: selectedLinkedAdvance.remainingAmount > 0 ? '#cf1322' : '#3f8600' }}>
                        {parseFloat(selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined ? selectedLinkedAdvance.remainingAmount : selectedLinkedAdvance.amount || 0).toLocaleString()} {language === 'ar' ? 'ر.س' : (displayCurrency || 'SAR')}
                      </strong></div>
                      <div>{t.generalExpenses.manager || 'Manager'}: <strong>{selectedLinkedAdvance.managerName}</strong></div>
                      {selectedLinkedAdvance.projectId && (
                        <div>{t.common.project || 'Project'}: <strong>{projects.find(p => p.id === selectedLinkedAdvance.projectId)?.name || t.common.loading}</strong></div>
                      )}
                    </Card>
                  )}

                  {/* Settlement Type: Expense or Return */}
                  <Form.Item
                    name="settlementType"
                    label={t.generalExpenses.settlementType || 'Settlement Type'}
                    rules={[{ required: true, message: t.generalExpenses.selectSettlementType || 'Please select settlement type' }]}
                    initialValue="expense"
                  >
                    <Radio.Group
                      value={settlementType}
                      onChange={(e) => setSettlementType(e.target.value)}
                      buttonStyle="solid"
                      size="large"
                    >
                      <Radio.Button value="expense">{t.generalExpenses.expense || 'Expense'}</Radio.Button>
                      <Radio.Button value="return">{t.generalExpenses.cashReturn || 'Cash Return'}</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {/* Project ID - Read-Only for settlements, with Transfer button */}
                  {isEngineering && selectedLinkedAdvance?.projectId && (
                    <Form.Item
                      name="projectId"
                      label={t.common.project || 'Project'}
                    >
                      <Input.Group compact>
                        <Input
                          value={projects.find(p => p.id === selectedLinkedAdvance.projectId)?.name || t.common.loading}
                          readOnly
                          disabled
                          style={{ width: 'calc(100% - 140px)' }}
                          size="large"
                        />
                        <Button
                          type="default"
                          onClick={() => {
                            // Don't pre-fill newProjectId - user must select a different project
                            transferForm.resetFields()
                            setTransferModalVisible(true)
                          }}
                          style={{ width: 140 }}
                          size="large"
                        >
                          {t.generalExpenses.transferAdvance || 'Transfer Advance'}
                        </Button>
                      </Input.Group>
                    </Form.Item>
                  )}

                  {/* Work Scope - Show for settlements with project that has work scopes */}
                  {isEngineering && selectedLinkedAdvance?.projectId && availableWorkScopes.length > 0 && settlementType === 'expense' && (
                    <Form.Item
                      name="workScope"
                      label={t.generalExpenses.workScopeLabel}
                      tooltip="نطاق العمل للمشروع"
                    >
                      <Select
                        placeholder={t.generalExpenses.selectWorkScopeOptional}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        size="large"
                        allowClear
                      >
                        {availableWorkScopes.map((scope) => (
                          <Option key={scope} value={scope}>
                            {scope}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}

                  {/* Purchase Order Section for Settlement (only for expense type) */}
                  {settlementType === 'expense' && (
                    <>
                      <Divider>إنشاء أمر شراء (Purchase Order) للتسوية</Divider>
                      
                      {/* Vendor/Recipient Selection */}
                      <Form.Item
                        name="settlementPoVendor"
                        label={t.generalExpenses.vendorRecipientLabel}
                        rules={[
                          {
                            validator: (_, value) => {
                              if (!settlementPoVendor && !isSettlementPoNewVendor) {
                                return Promise.reject(new Error('يرجى البحث واختيار مورد أو إضافة مورد جديد'))
                              }
                              return Promise.resolve()
                            }
                          }
                        ]}
                      >
                        <AutoComplete
                          options={settlementPoVendorOptions}
                          onSearch={handleSettlementPoVendorSearch}
                          onSelect={handleSettlementPoVendorSelect}
                          onChange={(value) => {
                            setSettlementPoVendorSearch(value)
                            if (!value) {
                              setSettlementPoVendor(null)
                              setIsSettlementPoNewVendor(false)
                            }
                          }}
                          value={settlementPoVendorSearch}
                          placeholder={t.generalExpenses.searchSupplierCustomer}
                          style={{ width: '100%' }}
                          filterOption={false}
                          notFoundContent={settlementPoVendorOptions.length === 0 && settlementPoVendorSearch ? 'لا توجد نتائج - يمكنك إضافة مورد جديد' : null}
                          size="large"
                        />
                      </Form.Item>

                      {/* New Vendor Form */}
                      {isSettlementPoNewVendor && (
                        <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
                          <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#d46b08' }}>
                            إضافة مورد جديد
                          </div>
                          <Row gutter={16}>
                            <Col span={24}>
                              <Form.Item
                                label={t.generalExpenses.supplierNameLabel}
                                required
                                tooltip="اسم المورد مطلوب"
                              >
                                <Input
                                  placeholder={t.generalExpenses.supplierNamePlaceholder}
                                  value={settlementPoNewVendorName}
                                  onChange={(e) => {
                                    const value = e.target.value
                                    setSettlementPoNewVendorName(value)
                                    setSettlementPoVendorSearch(value)
                                  }}
                                  size="large"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label={t.generalExpenses.phoneOptionalLabel}>
                                <Input
                                  placeholder={t.generalExpenses.phoneNumberPlaceholder}
                                  value={settlementPoNewVendorPhone}
                                  onChange={(e) => setSettlementPoNewVendorPhone(e.target.value)}
                                  size="large"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label={t.generalExpenses.emailOptionalLabel}>
                                <Input
                                  placeholder={t.generalExpenses.emailPlaceholder}
                                  value={settlementPoNewVendorEmail}
                                  onChange={(e) => setSettlementPoNewVendorEmail(e.target.value)}
                                  size="large"
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      )}

                      {/* Settlement PO Items */}
                      <Form.Item label={t.generalExpenses.purchaseOrderItemsLabel} required>
                        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                          <Col span={12}>
                            <Form.Item name="settlementPoItemDescription" noStyle>
                              <Input placeholder={t.generalExpenses.itemDescriptionPlaceholder} size="large" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item name="settlementPoQuantity" noStyle>
                              <InputNumber
                                placeholder={t.generalExpenses.quantityPlaceholder}
                                min={0.01}
                                step={1}
                                style={{ width: '100%' }}
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item name="settlementPoUnitPrice" noStyle>
                              <InputNumber
                                placeholder={t.generalExpenses.unitPricePlaceholder}
                                min={0}
                                step={0.01}
                                style={{ width: '100%' }}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                size="large"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Button type="dashed" onClick={handleAddSettlementPoItem} icon={<PlusOutlined />} style={{ marginBottom: 16, width: '100%' }} size="large">
                          إضافة بند
                        </Button>
                        {settlementPoItems.length === 0 && (
                          <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 8 }}>
                            * يجب إضافة بند واحد على الأقل لأمر الشراء
                          </div>
                        )}
                      </Form.Item>

                      {/* Display Added Items */}
                      {settlementPoItems.length > 0 && (
                        <Card title="البنود المضافة" size="small" style={{ marginBottom: 16 }}>
                          <Table
                            dataSource={settlementPoItems.map((item, index) => ({ ...item, key: index }))}
                            columns={[
                              { 
                                title: 'وصف البند/المادة', 
                                dataIndex: 'product',
                                render: (product) => <span style={{ fontWeight: 500 }}>{product}</span>
                              },
                              { title: 'الكمية', dataIndex: 'quantity' },
                              { 
                                title: 'سعر الوحدة', 
                                dataIndex: 'price', 
                                render: (p) => `${p.toLocaleString()} ريال` 
                              },
                              { 
                                title: 'الإجمالي', 
                                dataIndex: 'total', 
                                render: (t) => (
                                  <span style={{ fontWeight: 500, color: '#1890ff' }}>
                                    {t.toLocaleString()} ريال
                                  </span>
                                )
                              },
                              {
                                title: 'حذف',
                                render: (_, record: any) => (
                                  <Button
                                    type="link"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleRemoveSettlementPoItem(record.key)}
                                  >
                                    حذف
                                  </Button>
                                )
                              }
                            ]}
                            pagination={false}
                            size="small"
                            summary={() => {
                              let total = settlementPoItems.reduce((sum, item) => sum + (item.total || 0), 0)
                              let remainingAmount = selectedLinkedAdvance?.remainingAmount !== null && selectedLinkedAdvance?.remainingAmount !== undefined 
                                ? parseFloat(selectedLinkedAdvance.remainingAmount) 
                                : parseFloat(selectedLinkedAdvance?.amount || 0)
                              const exceedsLimit = total > remainingAmount && total > 0
                              
                              return (
                                <Table.Summary.Row style={{ backgroundColor: exceedsLimit ? '#fff2f0' : 'transparent' }}>
                                  <Table.Summary.Cell colSpan={3} align="right">
                                    <strong>المبلغ الإجمالي:</strong>
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell>
                                    <strong style={{ 
                                      color: exceedsLimit ? '#cf1322' : '#1890ff', 
                                      fontSize: 16,
                                      fontWeight: 'bold'
                                    }}>
                                      {total.toLocaleString()} ريال
                                    </strong>
                                    {exceedsLimit && selectedLinkedAdvance && (
                                      <div style={{ color: '#cf1322', fontSize: 12, marginTop: 4 }}>
                                        يتجاوز المبلغ المتبقي ({remainingAmount.toLocaleString()} ريال)
                                      </div>
                                    )}
                                  </Table.Summary.Cell>
                                  <Table.Summary.Cell />
                                </Table.Summary.Row>
                              )
                            }}
                          />
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Project ID - Optional (for advances only, not settlements) */}
              {isEngineering && transactionType !== 'settlement' && (
                <Form.Item
                  name="projectId"
                  label={t.generalExpenses.projectOptionalLabel}
                  tooltip="يمكن تركها فارغة للمهام العامة للشركة"
                >
                  <Select
                    placeholder={t.generalExpenses.selectProjectOptional}
                    showSearch
                    onChange={(value) => {
                      // Use handleProjectChange to maintain managerName sync
                      handleProjectChange(value)
                      // Trigger validation for managerName when project is selected
                      if (value) {
                        setTimeout(() => {
                          form.validateFields(['managerName']).catch(() => {
                            // Validation errors will be shown by Form.Item
                          })
                        }, 0)
                      }
                    }}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    size="large"
                    allowClear
                  >
                    {projects.map((p) => (
                      <Option key={p.id} value={p.id}>
                        {p.name} {p.client?.name ? `- ${p.client.name}` : ''}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <Form.Item
                name="amount"
                label={transactionType === 'settlement' && settlementType === 'expense' 
                  ? `مبلغ التسوية (يُحسب تلقائياً من البنود)` 
                  : formatCurrencyLabel('المبلغ', displayCurrency)}
                rules={[
                  { required: true, message: 'يرجى إدخال المبلغ' },
                  {
                    validator: (_, value) => {
                      // For expense-type settlements, amount is auto-calculated, so validation is handled separately
                      if (transactionType === 'settlement' && settlementType === 'expense') {
                        // This validation is handled in useEffect, so we just check if there are items
                        if (settlementPoItems.length === 0) {
                          return Promise.reject(new Error('يرجى إضافة بند واحد على الأقل'))
                        }
                        let total = calculateSettlementTotal()
                        if (total <= 0) {
                          return Promise.reject(new Error('يجب أن يكون المبلغ أكبر من صفر'))
                        }
                        return Promise.resolve()
                      }
                      
                      // For other cases (advance or return-type settlement), use normal validation
                      if (!value || value === null || value === undefined) {
                        return Promise.reject(new Error('يرجى إدخال المبلغ'))
                      }
                      const numValue = typeof value === 'number' ? value : parseFloat(value)
                      if (isNaN(numValue) || numValue <= 0) {
                        return Promise.reject(new Error('يجب أن يكون المبلغ أكبر من صفر'))
                      }
                      // For return-type settlements, validate that amount <= remaining amount
                      if (transactionType === 'settlement' && settlementType === 'return' && selectedLinkedAdvance) {
                        const remainingAmount = selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined 
                          ? parseFloat(selectedLinkedAdvance.remainingAmount) 
                          : parseFloat(selectedLinkedAdvance.amount || 0)
                        
                        if (remainingAmount <= 0) {
                          return Promise.reject(new Error('العهدة تم تسويتها بالكامل - لا يمكن إنشاء تسوية جديدة'))
                        }
                        
                        if (numValue > remainingAmount) {
                          return Promise.reject(new Error('المبلغ المدخل أكبر من الرصيد المتاح في العهدة'))
                        }
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
                help={transactionType === 'settlement' && settlementType === 'expense' && settlementAmountError ? (
                  <span style={{ color: '#ff4d4f' }}>{settlementAmountError}</span>
                ) : null}
                validateStatus={transactionType === 'settlement' && settlementType === 'expense' && settlementAmountExceedsLimit ? 'error' : undefined}
              >
                {transactionType === 'settlement' && settlementType === 'expense' ? (
                  <InputNumber
                    value={calculateSettlementTotal()}
                    disabled
                    size="large"
                    style={{ 
                      width: '100%',
                      backgroundColor: settlementAmountExceedsLimit ? '#fff2f0' : '#f5f5f5'
                    }}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0'}
                    parser={(value) => (value ? value.replace(/\$\s?|(,*)/g, '') : '0') as any}
                  />
                ) : (
                  <InputNumber
                    min={0.01}
                    step={0.01}
                    placeholder={t.generalExpenses.amountPlaceholder}
                    size="large"
                    style={{ width: '100%' }}
                    formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                    parser={(value) => (value ? value.replace(/\$\s?|(,*)/g, '') : '') as any}
                    max={transactionType === 'settlement' && settlementType === 'return' && selectedLinkedAdvance 
                      ? (selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined 
                          ? parseFloat(selectedLinkedAdvance.remainingAmount) 
                          : parseFloat(selectedLinkedAdvance.amount || 0))
                      : undefined}
                  />
                )}
              </Form.Item>
              
              {/* Show remaining amount info for expense-type settlements */}
              {transactionType === 'settlement' && settlementType === 'expense' && selectedLinkedAdvance && (
                <div style={{ 
                  marginBottom: 16, 
                  padding: '12px', 
                  backgroundColor: settlementAmountExceedsLimit ? '#fff2f0' : '#f0f9ff', 
                  border: `1px solid ${settlementAmountExceedsLimit ? '#ffccc7' : '#91d5ff'}`,
                  borderRadius: '4px'
                }}>
                  <div style={{ marginBottom: 4, fontWeight: 'bold', color: settlementAmountExceedsLimit ? '#cf1322' : '#1890ff' }}>
                    المبلغ المتبقي في العهدة: <span style={{ fontSize: '16px' }}>{parseFloat(selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined ? selectedLinkedAdvance.remainingAmount : selectedLinkedAdvance.amount || 0).toLocaleString()} ريال</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    يتم حساب مبلغ التسوية تلقائياً من مجموع بنود أمر الشراء
                  </div>
                </div>
              )}
            </>
              )}

              {/* Treasury Account Selection for Settlements - Only show for Return type */}
              {transactionType === 'settlement' && settlementType === 'return' && (
                <>
                  {/* Alert if no treasury accounts */}
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
                    label={t.generalExpenses.treasuryAccountLabel}
                    rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة للإرجاع' }]}
                    tooltip="اختر الحساب الذي سيتم إرجاع المبلغ إليه"
                  >
                    <Select 
                      size="large" 
                      placeholder={t.generalExpenses.selectTreasuryAccountPlaceholder} 
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

                  {/* Reference Number for Settlements */}
                  <Form.Item
                    name="referenceNumber"
                    label={t.generalExpenses.referenceNumberOptionalLabel}
                  >
                    <Input placeholder={t.generalExpenses.referenceNumberPlaceholder} size="large" />
                  </Form.Item>
                </>
              )}

          {/* Administrative Form: Simplified - Category, Frequency, Amount, Description, Date */}
          {expenseType === 'administrative' && (
            <>
              {/* Alert if no treasury accounts */}
              {treasuryAccounts.length === 0 && (
                <Alert
                  type="error"
                  message="تنبيه: لا يوجد حسابات خزينة معرفة. يرجى إنشاء حساب في صفحة الخزينة أولاً"
                  style={{ marginBottom: 16 }}
                  showIcon
                />
              )}

              {/* Category Selection */}
              <Form.Item
                name="category"
                label="الفئة / Category"
                rules={[{ required: true, message: 'يرجى اختيار الفئة' }]}
              >
                <Select
                  placeholder={t.generalExpenses.selectCategoryPlaceholder}
                  size="large"
                  popupRender={(menu) => (
                    <div>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ padding: '8px' }}>
                        {!showNewCategoryInput ? (
                          <Button
                            type="link"
                            icon={<PlusOutlined />}
                            onClick={() => setShowNewCategoryInput(true)}
                            block
                          >
                            إضافة فئة جديدة
                          </Button>
                        ) : (
                          <Space orientation="vertical" style={{ width: '100%' }}>
                            <Input
                              placeholder={t.generalExpenses.newCategoryNamePlaceholder}
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onPressEnter={handleAddCategory}
                            />
                            <Space>
                              <Button type="primary" size="small" onClick={handleAddCategory}>
                                إضافة
                              </Button>
                              <Button size="small" onClick={() => {
                                setShowNewCategoryInput(false)
                                setNewCategoryName('')
                              }}>
                                إلغاء
                              </Button>
                            </Space>
                          </Space>
                        )}
                      </div>
                    </div>
                  )}
                >
                  {adminCategories.map((cat) => (
                    <Option key={cat.value} value={cat.value}>
                      {cat.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Payment Frequency */}
              <Form.Item
                name="paymentFrequency"
                label="دورية الصرف / Frequency"
                rules={[{ required: true, message: 'يرجى اختيار دورية الصرف' }]}
              >
                <Select size="large">
                  <Option value="monthly">شهري (Monthly)</Option>
                  <Option value="yearly">سنوي (Yearly)</Option>
                  <Option value="one-time">لمرة واحدة (One-time)</Option>
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
                  size="large"
                />
              </Form.Item>

              {/* Amount */}
              <Form.Item
                name="amount"
                label={`المبلغ (${displayCurrency}) / Amount (${displayCurrency})`}
                rules={[
                  { required: true, message: 'يرجى إدخال المبلغ' },
                  {
                    validator: (_, value) => {
                      if (!value || value === null || value === undefined) {
                        return Promise.reject(new Error('يرجى إدخال المبلغ'))
                      }
                      const numValue = typeof value === 'number' ? value : parseFloat(value)
                      if (isNaN(numValue) || numValue <= 0) {
                        return Promise.reject(new Error('يجب أن يكون المبلغ أكبر من صفر'))
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
              >
                <InputNumber
                  min={0.01}
                  step={0.01}
                  placeholder="0.00"
                  size="large"
                  style={{ width: '100%' }}
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(value) => (value ? value.replace(/\$\s?|(,*)/g, '') : '') as any}
                />
              </Form.Item>

              {/* Treasury Account Selection */}
              <Form.Item
                name="treasuryAccountId"
                label="حساب الخزينة / Treasury Account"
                rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة/البنك للصرف' }]}
                tooltip="اختر الحساب الذي سيتم خصم المصروف منه"
              >
                <Select 
                  size="large" 
                  placeholder="اختر حساب الخزينة" 
                  disabled={treasuryAccounts.length === 0}
                  notFoundContent={treasuryAccounts.length === 0 ? "لا توجد حسابات خزينة" : null}
                  onChange={(value) => {
                    const account = treasuryAccounts.find(acc => acc.id === value)
                    setSelectedTreasuryAccount(account || null)
                    // Note: Currency is now fixed to branch currency, no syncing needed
                    console.log('✅ Treasury account selected:', { accountId: value, branchCurrency: displayCurrency });
                  }}
                >
                  {treasuryAccounts.map(acc => (
                    <Option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type === 'bank' ? 'Bank' : acc.type === 'cash_box' ? 'Cash' : acc.type})
                      {acc.currency && acc.currency !== displayCurrency ? ` - ${acc.currency}` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Exchange Rate Fields - Show when treasury currency != base currency */}
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => 
                  prevValues.treasuryAccountId !== currentValues.treasuryAccountId ||
                  prevValues.amount !== currentValues.amount ||
                  prevValues.exchangeRate !== currentValues.exchangeRate
                }
              >
                {({ getFieldValue }) => {
                  const treasuryAccountId = getFieldValue('treasuryAccountId')
                  const amount = getFieldValue('amount') || 0
                  const exchangeRate = getFieldValue('exchangeRate') || 1
                  const selectedAccount = treasuryAccounts.find(acc => acc.id === treasuryAccountId)
                  const accountCurrency = selectedAccount?.currency || displayCurrency
                  const showExchangeRate = selectedAccount && accountCurrency !== displayCurrency

                  if (showExchangeRate) {
                    const convertedAmount = amount && exchangeRate ? (parseFloat(amount) * parseFloat(exchangeRate)) : 0
                    
                    // Auto-update converted amount when amount or exchange rate changes
                    if (amount && exchangeRate) {
                      setTimeout(() => {
                        form.setFieldsValue({ convertedAmount: convertedAmount })
                      }, 0)
                    }

                    return (
                      <>
                        <Form.Item
                          name="exchangeRate"
                          label={`سعر الصرف (${accountCurrency} → ${displayCurrency}) / Exchange Rate`}
                          rules={[
                            { required: true, message: 'يرجى إدخال سعر الصرف' },
                            { type: 'number', min: 0.0001, message: 'يجب أن يكون سعر الصرف أكبر من صفر' }
                          ]}
                          tooltip={`سعر تحويل 1 ${accountCurrency} إلى ${displayCurrency}`}
                        >
                          <InputNumber
                            min={0.0001}
                            step={0.01}
                            placeholder="1.00"
                            size="large"
                            style={{ width: '100%' }}
                            formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                            parser={(value) => (value ? value.replace(/\$\s?|(,*)/g, '') : '') as any}
                            onChange={(value) => {
                              const amount = form.getFieldValue('amount') || 0
                              if (value && amount) {
                                const converted = parseFloat(amount) * parseFloat(value as any)
                                form.setFieldsValue({ convertedAmount: converted })
                              }
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name="convertedAmount"
                          label={`المبلغ المحول (${displayCurrency}) / Converted Amount`}
                        >
                          <InputNumber
                            min={0}
                            style={{ width: '100%' }}
                            placeholder={t.generalExpenses.amountPlaceholder}
                            size="large"
                            disabled
                            formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                            parser={(value) => (value ? value.replace(/\$\s?|(,*)/g, '') : '') as any}
                          />
                        </Form.Item>
                      </>
                    )
                  }
                  return null
                }}
              </Form.Item>

              {/* Description */}
              <Form.Item
                name="notes"
                label={`${t.generalExpenses.description} / Description`}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={t.generalExpenses.expenseDescriptionPlaceholder}
                  size="large"
                />
              </Form.Item>

              {/* Recipient Type Toggle */}
              <Form.Item
                name="recipientType"
                label={`${t.generalExpenses.recipientTypeLabel} / Recipient Type`}
                rules={[{ required: true, message: 'يرجى اختيار نوع المستلم' }]}
                initialValue="external"
              >
                <Radio.Group
                  value={recipientType}
                  onChange={(e) => {
                    setRecipientType(e.target.value)
                    setSelectedEmployeeId(null)
                    setSelectedWorkerId(null)
                    form.setFieldsValue({ 
                      recipientName: undefined, 
                      recipientWorkerId: undefined,
                      employeeId: undefined
                    })
                  }}
                  buttonStyle="solid"
                  size="large"
                >
                  <Radio.Button value="internal">داخلي / Internal</Radio.Button>
                  <Radio.Button value="external">خارجي / External</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {/* Recipient Name - Conditional based on type */}
              <Form.Item
                name={recipientType === 'internal' ? 'employeeId' : 'recipientName'}
                label={`${t.generalExpenses.recipientNameLabel} / Recipient Name`}
                rules={[
                  { 
                    required: true, 
                    message: recipientType === 'internal' 
                      ? (t.generalExpenses.selectEmployeeRequired || 'Please select an employee')
                      : 'يرجى اختيار/إدخال اسم المستلم'
                  },
                  // CRITICAL: Additional validation for internal recipients - ensure employee_id is selected
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (recipientType === 'internal' && !value) {
                        return Promise.reject(new Error(t.generalExpenses.selectEmployeeRequired || 'Please select an employee'))
                      }
                      return Promise.resolve()
                    }
                  })
                ]}
                tooltip={recipientType === 'internal' 
                  ? "اختر الموظف من القائمة - سيتم حفظ معرف الموظف لربط المصروف بالموظف"
                  : "اسم المستلم مهم لطباعة سند الصرف (Payment Voucher) لاحقاً"}
              >
                {recipientType === 'internal' ? (
                  <Select
                    placeholder={t.generalExpenses.selectEmployee}
                    showSearch
                    size="large"
                    value={selectedEmployeeId}
                    onChange={(value) => {
                      setSelectedEmployeeId(value)
                      const employee = employees.find(emp => emp.id === value)
                      if (employee) {
                        form.setFieldsValue({ 
                          recipientName: employee.name,
                          employeeId: value
                        })
                      }
                    }}
                    filterOption={(input, option) =>
                      String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    notFoundContent={employees.length === 0 ? 'No employees found. Please add employees in Labor & Staff Management.' : null}
                  >
                    {employees.map((employee) => (
                      <Option key={employee.id} value={employee.id} label={employee.name}>
                        {employee.name} - {employee.jobTitle || 'Employee'}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    placeholder={t.generalExpenses.enterExternalRecipientName}
                    size="large"
                  />
                )}
              </Form.Item>

              {/* Date - Single field for administrative expenses, defaults to today */}
              <Form.Item
                name="date"
                label={`${t.generalExpenses.dateLabel} / Date`}
                rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '40px', fontSize: '16px' }}
                  placeholder={t.generalExpenses.selectDatePlaceholder}
                  onChange={(e) => {
                    if (e.target.value) {
                      form.setFieldsValue({ date: e.target.value })
                    }
                  }}
                />
              </Form.Item>

              {/* Status - Allow users to set paid status for immediate treasury deduction */}
              <Form.Item
                name="status"
                label={`${t.generalExpenses.statusLabel} / Status`}
                initialValue="pending"
                tooltip="اختر 'مدفوع' لخصم المبلغ من الخزينة فوراً، أو 'قيد الانتظار' للموافقة لاحقاً"
              >
                <Select size="large">
                  <Option value="pending">قيد الانتظار / Pending</Option>
                  <Option value="paid">مدفوع / Paid</Option>
                </Select>
              </Form.Item>

              {/* Reference Number - Auto-generated if empty (optional field) */}
              <Form.Item
                name="referenceNumber"
                label={`${t.generalExpenses.referenceNumberOptionalLabel} / Reference Number (optional)`}
                tooltip="إذا تركته فارغاً، سيتم توليد رقم مرجع تلقائياً (EXP-001, EXP-002, إلخ)"
              >
                <Input placeholder={t.generalExpenses.expenseNumberPlaceholder} size="large" />
              </Form.Item>
            </>
          )}

          {/* Project Related Form - IDENTICAL to OrdersPage (no Category/Frequency) */}
          {expenseType === 'project' && (
            <>
              {isEngineering && (
                <Card size="small" style={{ marginBottom: 24, backgroundColor: '#f0f9ff', border: '1px solid #91d5ff' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="projectId"
                        label={<span style={{ fontWeight: 'bold' }}>{t.generalExpenses.projectLabel}</span>}
                        rules={[{ required: true, message: 'يرجى اختيار المشروع' }]}
                      >
                        <Select
                          placeholder={t.generalExpenses.selectProjectPlaceholder}
                          showSearch
                          onChange={handleProjectChange}
                          filterOption={(input, option) =>
                            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          size="large"
                        >
                          {projects.map((p) => (
                            <Option key={p.id} value={p.id}>
                              {p.name} {p.client?.name ? `- ${p.client.name}` : ''}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      {selectedProject && availableWorkScopes.length > 0 && (
                        <Form.Item
                          name="workScope"
                          label={<span style={{ fontWeight: 'bold' }}>{t.generalExpenses.workScopeBoldLabel}</span>}
                          rules={[{ required: true, message: 'يرجى اختيار نطاق العمل' }]}
                        >
                          <Select
                            placeholder={t.generalExpenses.selectWorkScopeOptional}
                            showSearch
                            filterOption={(input, option) =>
                              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            size="large"
                          >
                            {availableWorkScopes.map((scope) => (
                              <Option key={scope} value={scope}>
                                {scope}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      )}
                    </Col>
                  </Row>
                </Card>
              )}

              <Divider>بنود الشراء</Divider>

              <Form.Item
                name="customerSearch"
                label={t.orders.supplierCustomer || t.generalExpenses.vendorRecipientLabel}
                rules={[
                  {
                    validator: (_, value) => {
                      if (!selectedCustomer && !isNewSupplier) {
                        return Promise.reject(new Error('يرجى البحث واختيار مورد أو عميل'))
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
              >
                <AutoComplete
                  options={customerSearchOptions}
                  onSearch={handleCustomerSearch}
                  onSelect={handleCustomerSelect}
                  onChange={(value) => {
                    setCustomerSearchValue(value)
                    if (!value) {
                      setSelectedCustomer(null)
                      setIsNewSupplier(false)
                    }
                  }}
                  value={customerSearchValue}
                  placeholder="ابحث عن مورد أو عميل بالاسم أو الهاتف..."
                  style={{ width: '100%' }}
                  filterOption={false}
                  notFoundContent={customerSearchOptions.length === 0 && customerSearchValue ? 'لا توجد نتائج - يمكنك إضافة مورد جديد' : null}
                />
              </Form.Item>

              {isNewSupplier && (
                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
                  <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#d46b08' }}>
                    إضافة مورد جديد
                  </div>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        label={t.generalExpenses.supplierNameLabel}
                        required
                        tooltip="اسم المورد مطلوب"
                      >
                        <Input
                          placeholder="اسم المورد"
                          value={newSupplierName}
                          onChange={(e) => {
                            const value = e.target.value
                            setNewSupplierName(value)
                            setCustomerSearchValue(value)
                          }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="رقم الهاتف (اختياري)">
                        <Input
                          placeholder="رقم الهاتف"
                          value={newSupplierPhone}
                          onChange={(e) => setNewSupplierPhone(e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="البريد الإلكتروني (اختياري)">
                        <Input
                          placeholder="البريد الإلكتروني"
                          value={newSupplierEmail}
                          onChange={(e) => setNewSupplierEmail(e.target.value)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              )}

              {selectedCustomer && !isNewSupplier && (
                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#389e0d' }}>
                    المورد المحدد:
                  </div>
                  <div>الاسم: {selectedCustomer.name}</div>
                  {selectedCustomer.phone && <div>الهاتف: {selectedCustomer.phone}</div>}
                  {selectedCustomer.email && <div>البريد: {selectedCustomer.email}</div>}
                </Card>
              )}

              <Form.Item label={t.generalExpenses.purchaseOrderItemsLabel} required>
                <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Form.Item name="itemDescription" noStyle>
                      <Input placeholder="وصف البند/المادة (مثال: 100 كيس أسمنت)" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item 
                      name="quantity" 
                      label={t.generalExpenses.quantityColumn}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        placeholder="الكمية"
                        min={0.01}
                        step={1}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item 
                      name="unitPrice" 
                      label={t.generalExpenses.unitPriceColumn}
                      style={{ marginBottom: 0 }}
                    >
                      <InputNumber
                        placeholder="سعر الوحدة"
                        min={0}
                        step={0.01}
                        style={{ width: '100%' }}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="dashed" onClick={handleAddItem} icon={<PlusOutlined />} style={{ marginBottom: 16, width: '100%' }}>
                  إضافة بند
                </Button>
                {selectedProducts.length === 0 && (
                  <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 8 }}>
                    * يجب إضافة بند واحد على الأقل
                  </div>
                )}
              </Form.Item>

              {selectedProducts.length > 0 && (
                <Card title="البنود المضافة" size="small" style={{ marginBottom: 16 }}>
                  <Table
                    dataSource={selectedProducts.map((item, index) => ({ ...item, key: index }))}
                    columns={[
                      { 
                        title: 'وصف البند/المادة', 
                        dataIndex: 'product',
                        render: (product) => <span style={{ fontWeight: 500 }}>{product}</span>
                      },
                      { title: 'الكمية', dataIndex: 'quantity' },
                      { 
                        title: 'سعر الوحدة', 
                        dataIndex: 'price', 
                        render: (p) => `${p.toLocaleString()} ريال` 
                      },
                      { 
                        title: 'الإجمالي', 
                        dataIndex: 'total', 
                        render: (t) => (
                          <span style={{ fontWeight: 500, color: '#1890ff' }}>
                            {t.toLocaleString()} ريال
                          </span>
                        )
                      },
                      {
                        title: 'حذف',
                        render: (_, record: any) => (
                          <Button
                            type="link"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveItem(record.key)}
                          >
                            حذف
                          </Button>
                        )
                      }
                    ]}
                    pagination={false}
                    size="small"
                    summary={() => {
                      let total = selectedProducts.reduce((sum, item) => sum + (item.total || 0), 0)
                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell colSpan={3} align="right">
                            <strong>المبلغ الإجمالي:</strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell>
                            <strong style={{ color: '#1890ff', fontSize: 16 }}>
                              {total.toLocaleString()} ريال
                            </strong>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell />
                        </Table.Summary.Row>
                      )
                    }}
                  />
                </Card>
              )}
            </>
          )}

          {/* Common fields for Manager Advance expenses only (Administrative expenses handled above) */}
          {expenseType === 'manager_advance' && (
            <>
              {/* Single Date field - defaults to today */}
              <Form.Item
                name="date"
                label={t.generalExpenses.dateLabel}
                rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
                initialValue={dayjs().format('YYYY-MM-DD')}
                getValueFromEvent={(e) => e.target.value}
                getValueProps={(value) => ({
                  value: value ? (typeof value === 'string' ? value : dayjs(value).format('YYYY-MM-DD')) : dayjs().format('YYYY-MM-DD')
                })}
              >
                <input
                  type="date"
                  className="ant-input"
                  style={{ width: '100%', padding: '6px 11px', border: '1px solid #d9d9d9', borderRadius: '2px', height: '40px', fontSize: '16px' }}
                  placeholder={t.generalExpenses.selectDatePlaceholder}
                />
              </Form.Item>

              {/* Status - Only show for advances, not settlements */}
              {transactionType !== 'settlement' && (
                <Form.Item
                  name="status"
                  label={t.generalExpenses.statusLabel}
                  initialValue="pending"
                >
                  <Select 
                    size="large"
                    disabled={true}
                    title="الحالة للقراءة فقط - لا يمكن تعديلها من قبل المحاسب"
                  >
                    <Option value="pending">قيد المراجعة</Option>
                    <Option value="approved">تمت الموافقة</Option>
                    <Option value="rejected">مرفوض</Option>
                  </Select>
                </Form.Item>
              )}

              {/* Treasury Account Selection - Hidden for settlements, shown for advances */}
              {transactionType !== 'settlement' && (
                <>
                  {/* Alert if no treasury accounts */}
                  {treasuryAccounts.length === 0 && (
                    <Alert
                      type="error"
                      message="تنبيه: لا يوجد حسابات خزينة معرفة. يرجى إنشاء حساب في صفحة الخزينة أولاً"
                      style={{ marginBottom: 16 }}
                      showIcon
                    />
                  )}
                  
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="treasuryAccountId"
                        label={t.generalExpenses.treasuryAccountLabel}
                        rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة/البنك للصرف' }]}
                        tooltip="اختر الحساب الذي سيتم خصم مبلغ العهدة منه"
                      >
                        <Select 
                          size="large" 
                          placeholder={t.generalExpenses.selectTreasuryAccountPlaceholder} 
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
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="referenceNumber"
                        label={t.generalExpenses.referenceNumberLabel}
                        tooltip={transactionType === 'advance' && !editingExpense ? "سيتم توليد الرقم تلقائياً" : undefined}
                      >
                        <Input 
                          placeholder={transactionType === 'advance' && !editingExpense ? "سيتم توليد الرقم تلقائياً" : "رقم المرجع أو رقم الفاتورة"} 
                          size="large"
                          disabled={transactionType === 'advance' && !editingExpense}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}

              {/* For settlements, show a note that payment method is automatically set */}
              {transactionType === 'settlement' && (
                <Row gutter={16}>
                  <Col xs={24}>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#f0f9ff', 
                      border: '1px solid #91d5ff',
                      borderRadius: '4px',
                      marginBottom: '16px',
                      color: '#1890ff',
                      fontSize: '14px'
                    }}>
                      <strong>ملاحظة:</strong> طريقة الدفع لهذه التسوية هي "تسوية عهدة" (settlement) - يتم تعيينها تلقائياً ولا يمكن تعديلها.
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="referenceNumber"
                      label={t.generalExpenses.referenceNumberOptionalLabel}
                    >
                      <Input 
                        placeholder="رقم المرجع أو رقم الفاتورة" 
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </>
          )}

          {/* Common fields for Project Related expenses */}
          {expenseType === 'project' && (
            <>
              <Divider />
              
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="status"
                    label={t.generalExpenses.purchaseOrderStatusLabel}
                    initialValue="pending"
                  >
                    <Select size="large">
                      <Option value="pending">قيد الانتظار</Option>
                      <Option value="processing">قيد المعالجة</Option>
                      <Option value="completed">مكتمل</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="treasuryAccountId"
                    label={t.generalExpenses.treasuryAccountLabel}
                    rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة/البنك للصرف' }]}
                    tooltip="اختر الحساب الذي سيتم خصم قيمة أمر الشراء منه"
                  >
                    <Select 
                      size="large"
                      placeholder={t.generalExpenses.selectTreasuryAccountPlaceholder} 
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
                </Col>
              </Row>
            </>
          )}

          {/* Notes field - only show for non-administrative expenses (admin expenses have it above) */}
          {expenseType !== 'administrative' && (
            <Form.Item
              name="notes"
              label="ملاحظات (اختياري)"
            >
              <Input.TextArea
                rows={3}
                placeholder={t.generalExpenses.additionalNotesPlaceholder}
                size="large"
              />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                disabled={
                  (transactionType === 'settlement' && settlementType === 'expense' && settlementAmountExceedsLimit) ||
                  (expenseType === 'administrative' && treasuryAccounts.length === 0)
                }
                title={
                  transactionType === 'settlement' && settlementType === 'expense' && settlementAmountExceedsLimit 
                    ? 'لا يمكن الحفظ: مجموع البنود يتجاوز المبلغ المتبقي'
                    : expenseType === 'administrative' && treasuryAccounts.length === 0
                    ? 'لا يمكن الحفظ: لا يوجد حسابات خزينة'
                    : undefined
                }
              >
                {editingExpense ? 'تحديث' : 'حفظ'}
              </Button>
              <Button onClick={handleCancel} size="large">
                إلغاء
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Transfer Advance Modal */}
      <Modal
        title="ترحيل العهدة"
        open={transferModalVisible}
        onOk={async () => {
          try {
            const values = await transferForm.validateFields()
            if (!selectedLinkedAdvance) {
              message.error('لم يتم العثور على تفاصيل العهدة المرتبطة')
              return
            }
            
            const result = await paymentsService.transferAdvance(
              selectedLinkedAdvance.id,
              values.newProjectId,
              dayjs().format('YYYY-MM-DD')
            )
            
            if (result.success) {
              message.success('تم نقل العهدة بنجاح')
              setTransferModalVisible(false)
              transferForm.resetFields()
              setSelectedLinkedAdvance(null)
              loadExpenses()
              if (activeTab === 'petty-cash') {
                loadPettyCashAdvances()
                loadOutstandingAdvances()
                loadOpenAdvances()
              }
              // Close the settlement modal after successful transfer
              handleCancel()
            } else {
              message.error(result.error || 'فشل في نقل العهدة')
            }
          } catch (error) {
            console.error('Error transferring advance:', error)
            if (error.errorFields) {
              message.error('يرجى اختيار مشروع جديد')
            } else {
              message.error('حدث خطأ أثناء نقل العهدة')
            }
          }
        }}
        onCancel={() => {
          setTransferModalVisible(false)
          transferForm.resetFields()
        }}
        okText="ترحيل"
        cancelText="إلغاء"
        width={600}
      >
        {selectedLinkedAdvance && (
          <Form form={transferForm} layout="vertical" style={{ marginTop: 24 }}>
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#d46b08' }}>
                تفاصيل العهدة الحالية:
              </div>
              <div>المشروع الحالي: <strong>{projects.find(p => p.id === selectedLinkedAdvance.projectId)?.name || 'غير محدد'}</strong></div>
              <div>المبلغ المتبقي: <strong>{parseFloat(selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined ? selectedLinkedAdvance.remainingAmount : selectedLinkedAdvance.amount || 0).toLocaleString()} ريال</strong></div>
              <div>المدير: <strong>{selectedLinkedAdvance.managerName}</strong></div>
            </Card>
            
            <Form.Item
              name="newProjectId"
              label="المشروع الجديد"
              rules={[{ required: true, message: 'يرجى اختيار المشروع الجديد' }]}
            >
              <Select
                placeholder={t.generalExpenses.selectNewProjectPlaceholder}
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
                size="large"
              >
                {projects
                  .filter(p => p.id !== selectedLinkedAdvance.projectId) // Exclude current project
                  .map((p) => (
                    <Option key={p.id} value={p.id}>
                      {p.name} {p.client?.name ? `- ${p.client.name}` : ''}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
            
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f0f9ff', 
              border: '1px solid #91d5ff',
              borderRadius: '4px',
              marginTop: 16
            }}>
              <strong>ملاحظة:</strong> سيتم إغلاق العهدة الحالية وإنشاء عهدة جديدة في المشروع المحدد بنفس المبلغ المتبقي.
            </div>
          </Form>
        )}
      </Modal>

      {/* Secure Deletion Modal (3-Layer Security Protocol) */}
      <Modal
        title={language === 'ar' ? `حذف المصروف - ${expenseToDelete?.paymentNumber || expenseToDelete?.id}` : `Delete Expense - ${expenseToDelete?.paymentNumber || expenseToDelete?.id}`}
        open={deleteModalVisible}
        onOk={async () => {
          try {
            const values = await deleteForm.validateFields()
            
            if (!expenseToDelete) {
              message.error('No expense selected for deletion')
              return
            }

            await handleDeleteExpense(expenseToDelete.id, values.password, values.deletionReason)
            
            setDeleteModalVisible(false)
            setExpenseToDelete(null)
            deleteForm.resetFields()
          } catch (error) {
            console.error('Error validating deletion form:', error)
            if (error.errorFields) {
              message.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields')
            }
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false)
          setExpenseToDelete(null)
          deleteForm.resetFields()
        }}
        okText={language === 'ar' ? 'حذف' : 'Delete'}
        cancelText={language === 'ar' ? 'إلغاء' : 'Cancel'}
        okButtonProps={{ danger: true }}
        width={600}
      >
        <Alert
          type="warning"
          message={language === 'ar' ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه' : 'Warning: This action cannot be undone'}
          description={language === 'ar' ? 'سيتم حذف المصروف وجميع بياناته المرتبطة. يرجى إدخال كلمة المرور للتأكيد.' : 'This will permanently delete the expense and all associated data. Please enter your password to confirm.'}
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={deleteForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="password"
            label={language === 'ar' ? 'كلمة المرور' : 'Password'}
            rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your password' }]}
          >
            <Input.Password
              placeholder={language === 'ar' ? 'أدخل كلمة المرور للتأكيد' : 'Enter password to confirm'}
              autoComplete="current-password"
            />
          </Form.Item>
          
          <Form.Item
            name="deletionReason"
            label={language === 'ar' ? 'سبب الحذف' : 'Deletion Reason'}
            rules={[{ required: true, message: language === 'ar' ? 'يرجى إدخال سبب الحذف' : 'Please provide a reason for deletion' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder={language === 'ar' ? 'اشرح سبب حذف هذا المصروف...' : 'Explain why you are deleting this expense...'}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GeneralExpenses
