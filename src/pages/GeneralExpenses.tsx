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
import { useTenant } from '../contexts/TenantContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Title } = Typography

type ExpenseType = 'administrative' | 'project' | 'manager_advance'
type TransactionType = 'regular' | 'advance' | 'settlement'

const GeneralExpenses = () => {
  const { industryType } = useTenant()
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
        setSettlementAmountError('المبلغ المدخل أكبر من الرصيد المتاح في العهدة')
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
    try {
      const expensePayments = await paymentsService.getAllExpenses()

      const expensesWithProjects = await Promise.all(
        expensePayments.map(async (expense) => {
          let projectName = null
          if (expense.projectId) {
            const project = await projectsService.getProjectById(expense.projectId)
            projectName = project?.name || null
          }
          return {
            ...expense,
            projectName,
            sourceTarget: expense.isGeneralExpense ? 'Admin/Office' : projectName || 'مشروع غير محدد'
          }
        })
      )

      expensesWithProjects.sort((a, b) => {
        const dateA = new Date(a.dueDate || a.createdAt).getTime()
        const dateB = new Date(b.dueDate || b.createdAt).getTime()
        return dateB - dateA
      })

      setExpenses(expensesWithProjects)
    } catch (error) {
      console.error('Error loading expenses:', error)
      message.error('فشل في تحميل المصاريف')
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
    
    // Determine recipient type
    const recipientWorker = expense.recipientName ? workers.find(w => w.name === expense.recipientName) : null
    const recipientTypeValue = recipientWorker ? 'internal' : 'external'
    if (recipientWorker) {
      setRecipientType('internal')
      setSelectedWorkerId(recipientWorker.id)
    } else {
      setRecipientType('external')
      setSelectedWorkerId(null)
    }

    form.setFieldsValue({
      expenseType: expenseTypeValue,
      projectId: expense.projectId || undefined,
      category: expense.expenseCategory || undefined,
      amount: expense.amount,
      date: expenseTypeValue === 'administrative' || expenseTypeValue === 'manager_advance' ? expenseDate : undefined,
      dueDate: expenseTypeValue !== 'administrative' && expenseTypeValue !== 'manager_advance' ? (expense.dueDate ? dayjs(expense.dueDate) : undefined) : undefined,
      paidDate: expenseTypeValue !== 'administrative' && expenseTypeValue !== 'manager_advance' ? (expense.paidDate ? dayjs(expense.paidDate) : undefined) : undefined,
      status: expenseTypeValue === 'administrative' ? 'paid' : (expenseTypeValue === 'manager_advance' && expense.transactionType !== 'settlement' ? (expense.status || 'pending') : undefined),
      paymentMethod: expense.paymentMethod || undefined,
      referenceNumber: expense.referenceNumber || undefined,
      notes: expense.notes || undefined,
      recipientName: expense.recipientName || undefined,
      recipientType: recipientTypeValue,
      recipientWorkerId: recipientWorker?.id || undefined,
      paymentFrequency: expense.paymentFrequency || 'one-time',
      transactionType: expense.transactionType || 'regular',
      managerName: expense.managerName || undefined,
      linkedAdvanceId: expense.linkedAdvanceId || undefined,
      settlementType: expense.settlementType || 'expense'
    })
    setIsModalVisible(true)
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      const result = await paymentsService.deletePayment(id)
      if (result.success) {
        message.success('تم حذف المصروف بنجاح')
        loadExpenses()
        if (activeTab === 'petty-cash') {
          loadPettyCashAdvances()
          loadOutstandingAdvances()
        }
      } else {
        message.error(result.error || 'فشل في حذف المصروف')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      message.error('فشل في حذف المصروف')
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      message.error('يرجى إدخال اسم الفئة')
      return
    }

    try {
      const result = await categoryService.addCategory({
        name: newCategoryName.trim(),
        type: expenseType,
        createdBy: 'user'
      })

      if (result.success) {
        message.success('تم إضافة الفئة بنجاح')
        setNewCategoryName('')
        setShowNewCategoryInput(false)
        await loadCategories()
        form.setFieldsValue({ category: result.category.name })
      } else {
        message.error(result.error || 'فشل في إضافة الفئة')
      }
    } catch (error) {
      console.error('Error adding category:', error)
      message.error('فشل في إضافة الفئة')
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
          label: `إضافة مورد جديد: "${searchText.trim()}"`,
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
    
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (project && project.workScopes && Array.isArray(project.workScopes) && project.workScopes.length > 0) {
        setAvailableWorkScopes(project.workScopes)
      } else {
        setAvailableWorkScopes([])
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
      message.error('يرجى إدخال وصف البند')
      return
    }

    if (quantity <= 0) {
      message.error('الكمية يجب أن تكون أكبر من صفر')
      return
    }

    if (unitPrice < 0) {
      message.error('سعر الوحدة يجب أن يكون أكبر من أو يساوي صفر')
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
    message.success('تم إضافة البند')
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
          label: `إضافة مورد جديد: "${searchText.trim()}"`,
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
      message.error('يرجى إدخال وصف البند')
      return
    }

    if (quantity <= 0) {
      message.error('الكمية يجب أن تكون أكبر من صفر')
      return
    }

    if (unitPrice < 0) {
      message.error('سعر الوحدة يجب أن يكون أكبر من أو يساوي صفر')
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
    message.success('تم إضافة البند')
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
    console.log('Submitting data:', values)
    console.log('Expense Type:', expenseType)
    console.log('Editing Expense:', editingExpense)
    
    try {
      const isAdmin = expenseType === 'administrative'
      const isProjectExpense = expenseType === 'project'
      const isManagerAdvance = expenseType === 'manager_advance'
      
      // For project expenses, use ONLY ordersService (same as OrdersPage) - NO paymentsService
      if (isProjectExpense) {
        if (selectedProducts.length === 0) {
          message.error('يرجى إضافة بند واحد على الأقل')
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
            message.error('يرجى إدخال اسم المورد')
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
            message.success('تم إضافة المورد الجديد بنجاح')
          } else {
            message.error(createResult.error || 'فشل في إضافة المورد الجديد')
            return
          }
        } else if (selectedCustomer) {
          finalCustomerId = selectedCustomer.id
          finalCustomerName = selectedCustomer.name
          finalCustomerPhone = selectedCustomer.phone || ''
          finalCustomerEmail = selectedCustomer.email || ''
        } else {
          message.error('يرجى اختيار أو إضافة مورد')
          return
        }

        // Validate project selection for engineering mode
        if (isEngineering && !values.projectId) {
          message.error('يرجى اختيار المشروع')
          return
        }

        // Validate treasury account selection
        if (!values.treasuryAccountId) {
          message.error('يرجى اختيار حساب الخزينة/البنك للصرف')
          return
        }

        // Derive payment method from treasury account type
        const selectedAccount = treasuryAccounts.find(acc => acc.id === values.treasuryAccountId)
        if (!selectedAccount) {
          message.error('حساب الخزينة المحدد غير موجود')
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

        const orderResult = await ordersService.createOrder(orderData)
        
        if (orderResult.success) {
          message.success('تم إضافة أمر الشراء بنجاح')
          
          // Update treasury if account selected - must succeed
          if (values.treasuryAccountId && orderResult.order?.id) {
            try {
              // Use order total (includes tax and discount) instead of items total
              const totalAmount = parseFloat(orderResult.order.total) || 0
              
              if (totalAmount <= 0) {
                message.warning('⚠️ تحذير: المبلغ الإجمالي صفر أو سالب، لن يتم خصم من الخزينة')
              } else {
                const treasuryResult = await treasuryService.createTransaction({
                  accountId: values.treasuryAccountId,
                  transactionType: 'outflow',
                  amount: totalAmount,
                  referenceType: 'order',
                  referenceId: orderResult.order.id,
                  description: `أمر شراء: ${finalCustomerName} - ${values.notes || ''}`
                })
                
                if (treasuryResult.success) {
                  console.log('✅ GeneralExpenses: Treasury transaction created successfully for project expense', {
                    transactionId: treasuryResult.transaction?.id,
                    accountId: values.treasuryAccountId,
                    accountName: treasuryResult.accountName,
                    newBalance: treasuryResult.newBalance
                  })
                  message.success(`✅ تم خصم ${totalAmount.toLocaleString()} ريال من حساب الخزينة (${treasuryResult.accountName || 'غير محدد'})`)
                  loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
                } else {
                  console.error('❌ GeneralExpenses: Failed to update treasury for project expense:', treasuryResult.error)
                  message.error({
                    content: `❌ فشل خصم المبلغ من الخزينة: ${treasuryResult.error || 'خطأ غير معروف'}`,
                    duration: 10,
                    style: { marginTop: '10vh' }
                  })
                }
              }
            } catch (error) {
              console.error('❌ GeneralExpenses: Exception during treasury update for project expense:', error)
              message.error({
                content: `❌ خطأ أثناء خصم المبلغ من الخزينة: ${error.message || 'خطأ غير معروف'}`,
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
          message.error(orderResult.error || 'فشل في إنشاء أمر الشراء')
        }

        return
      }

      // For Manager Advance expenses
      if (isManagerAdvance) {
        // For settlement, manager name comes from the linked advance, so skip validation
        if (transactionType !== 'settlement' && !values.managerName) {
          message.error('يرجى إدخال اسم مدير المشروع')
          return
        }
        
        // Validate amount <= remaining amount (not original amount)
        // Use 'let' instead of 'const' because amountValue may be reassigned for expense-type settlements
        let amountValue = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount)
        
        // For non-settlement advances, validate amount and treasury account immediately
        // For settlements, validation happens later (expense-type: from PO items, return-type: after checking remaining amount)
        if (transactionType !== 'settlement') {
          if (!values.amount || isNaN(amountValue) || amountValue <= 0) {
            message.error('يرجى إدخال مبلغ صحيح')
            return
          }
          
          // Validate treasury account for advances - ensure it's not empty string or null
          const treasuryAccountId = values.treasuryAccountId?.trim() || null
          if (!treasuryAccountId || treasuryAccountId === '') {
            message.error('يرجى اختيار حساب الخزينة/البنك للصرف')
            return
          }
        }
        
        // For settlement, validate linked advance and prepare PO data
        if (transactionType === 'settlement') {
          if (!values.linkedAdvanceId) {
            message.error('يرجى اختيار العهدة المفتوحة')
            return
          }

          if (!selectedLinkedAdvance) {
            message.error('لم يتم العثور على تفاصيل العهدة المرتبطة')
            return
          }

          // For expense-type settlements, calculate amount from PO items and validate
          if (settlementType === 'expense') {
            if (!selectedLinkedAdvance.projectId) {
              message.error('العهدة المرتبطة لا تحتوي على مشروع. يرجى اختيار مشروع للتسوية')
              return
            }

            // Validate vendor/recipient
            if (!settlementPoVendor && !isSettlementPoNewVendor) {
              message.error('يرجى اختيار أو إضافة مورد/مستلم لأمر الشراء')
              return
            }

            // Validate PO items
            if (settlementPoItems.length === 0) {
              message.error('يرجى إضافة بند واحد على الأقل لأمر الشراء')
              return
            }

            // Calculate amount from PO items for expense-type settlements
            let calculatedAmount = calculateSettlementTotal()
            if (calculatedAmount <= 0) {
              message.error('يجب أن يكون مجموع البنود أكبر من صفر')
              return
            }

            // Validate calculated amount against remaining amount
            // NOTE: This validation ONLY runs for settlements (transactionType === 'settlement')
            // For new advances or administrative expenses, this validation is skipped
            let remainingAmount = selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined 
              ? parseFloat(selectedLinkedAdvance.remainingAmount) 
              : parseFloat(selectedLinkedAdvance.amount || 0)

            if (remainingAmount <= 0) {
              message.error('العهدة تم تسويتها بالكامل - لا يمكن إنشاء تسوية جديدة')
              return
            }

            if (calculatedAmount > remainingAmount) {
              message.error('المبلغ المدخل أكبر من الرصيد المتاح في العهدة')
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
                message.error('يرجى إدخال اسم المورد/المستلم')
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
                message.success('تم إضافة المورد الجديد بنجاح')
              } else {
                message.error(createResult.error || 'فشل في إضافة المورد الجديد')
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
              message.success('تم حفظ التسوية وأمر الشراء بنجاح')
              
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
              message.error(result.error || 'فشل في حفظ التسوية وأمر الشراء')
            }
            return
          } else {
            // For return-type settlements, validate manually entered amount
            // NOTE: This validation ONLY runs for settlements (transactionType === 'settlement')
            // For new advances or administrative expenses, this validation is skipped
            // Re-parse amountValue from form for return-type settlements
            amountValue = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount)
            if (!values.amount || isNaN(amountValue) || amountValue <= 0) {
              message.error('يرجى إدخال مبلغ صحيح')
              return
            }
            
            // Validate treasury account for return-type settlements - ensure it's not empty string or null
            const treasuryAccountId = values.treasuryAccountId?.trim() || null
            if (!treasuryAccountId || treasuryAccountId === '') {
              message.error('يرجى اختيار حساب الخزينة للإرجاع')
              return
            }
            
            const remainingAmount = selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined 
              ? parseFloat(selectedLinkedAdvance.remainingAmount) 
              : parseFloat(selectedLinkedAdvance.amount || 0)

            if (remainingAmount <= 0) {
              message.error('العهدة تم تسويتها بالكامل - لا يمكن إنشاء تسوية جديدة')
              return
            }

            if (amountValue > remainingAmount) {
              message.error('المبلغ المدخل أكبر من الرصيد المتاح في العهدة')
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
            message.error('يرجى إدخال مبلغ صحيح')
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
        let managerName = values.managerName || null
        if (transactionType === 'settlement' && values.linkedAdvanceId) {
          const linkedAdvance = selectedLinkedAdvance || openAdvances.find(a => a.id === values.linkedAdvanceId)
          if (linkedAdvance) {
            managerName = linkedAdvance.managerName
            // For return-type settlements, we still need to update remaining_amount
            // This will be handled in the service, but we need to ensure the advance exists
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
          settlementType: transactionType === 'settlement' ? (settlementType || 'expense') : null
        }

        let result
        if (editingExpense) {
          result = await paymentsService.updatePayment(editingExpense.id, paymentData)
        } else {
          result = await paymentsService.createPayment(paymentData)
        }

        if (result.success) {
          message.success(transactionType === 'settlement' ? 'تم حفظ التسوية بنجاح' : 'تم حفظ العهدة بنجاح')
          
          // Create treasury transaction for advances (non-settlement) - ensure it's not empty string or null
          if (transactionType !== 'settlement') {
            const treasuryAccountIdForAdvance = values.treasuryAccountId?.trim() || null
            if (treasuryAccountIdForAdvance && treasuryAccountIdForAdvance !== '' && result.payment?.id) {
              try {
                // Console log to trace account_id value
                console.log('GeneralExpenses: Creating treasury transaction for advance', {
                  paymentId: result.payment.id,
                  accountId: treasuryAccountIdForAdvance,
                  accountIdType: typeof treasuryAccountIdForAdvance,
                  accountIdLength: treasuryAccountIdForAdvance?.length
                })
                
                const treasuryResult = await treasuryService.createTransaction({
                  accountId: treasuryAccountIdForAdvance,
                  transactionType: 'outflow',
                  amount: amountValue,
                  referenceType: 'expense',
                  referenceId: result.payment.id,
                  description: `عهدة مدير: ${managerName || ''} - ${referenceNumber || ''} - ${values.notes || ''}`
                })
                
                if (treasuryResult.success) {
                  console.log('GeneralExpenses: Treasury transaction created successfully for advance', {
                    transactionId: treasuryResult.transaction?.id,
                    accountId: treasuryAccountIdForAdvance,
                    accountName: treasuryResult.accountName,
                    newBalance: treasuryResult.newBalance
                  })
                  message.success(`✅ تم خصم ${amountValue.toLocaleString()} ريال من حساب الخزينة (${treasuryResult.accountName || 'غير محدد'})`)
                } else {
                  console.error('GeneralExpenses: Failed to update treasury for advance:', treasuryResult.error)
                  message.error({
                    content: `❌ فشل خصم المبلغ من الخزينة: ${treasuryResult.error || 'خطأ غير معروف'}`,
                    duration: 10,
                  })
                }
              } catch (error) {
                console.error('GeneralExpenses: Error updating treasury for advance:', error)
                message.error('حدث خطأ أثناء خصم المبلغ من الخزينة')
              }
            }
          }
          
          // Create treasury transaction for return-type settlements - ensure it's not empty string or null
          const treasuryAccountIdForReturn = values.treasuryAccountId?.trim() || null
          if (transactionType === 'settlement' && settlementType === 'return' && treasuryAccountIdForReturn && treasuryAccountIdForReturn !== '' && result.payment?.id) {
            try {
              // Console log to trace account_id value
              console.log('GeneralExpenses: Creating treasury transaction for return settlement', {
                paymentId: result.payment.id,
                accountId: treasuryAccountIdForReturn,
                accountIdType: typeof treasuryAccountIdForReturn,
                accountIdLength: treasuryAccountIdForReturn?.length
              })
              
              const treasuryResult = await treasuryService.createTransaction({
                accountId: treasuryAccountIdForReturn,
                transactionType: 'inflow', // Return/deposit back to treasury
                amount: amountValue,
                referenceType: 'expense',
                referenceId: result.payment.id,
                description: `تسوية عهدة (مرتجع): ${selectedLinkedAdvance?.referenceNumber || selectedLinkedAdvance?.paymentNumber || ''} - ${values.notes || ''}`
              })
              
              if (treasuryResult.success) {
                console.log('GeneralExpenses: Treasury transaction created successfully for return settlement', {
                  transactionId: treasuryResult.transaction?.id,
                  accountId: treasuryAccountIdForReturn,
                  newBalance: treasuryResult.newBalance
                })
              } else {
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
          message.error(result.error || 'فشل في حفظ العهدة')
        }
        return
      }

      // For Administrative expenses
      if (isAdmin) {
        if (!values.category) {
          message.error('يرجى اختيار الفئة')
          return
        }
        let amountValue = typeof values.amount === 'number' ? values.amount : parseFloat(values.amount)
        if (!values.amount || isNaN(amountValue) || amountValue <= 0) {
          message.error('يرجى إدخال مبلغ صحيح')
          return
        }
        if (!values.paymentFrequency) {
          message.error('يرجى اختيار دورية الصرف')
          return
        }
        // Validate treasury account for administrative expenses - ensure it's not empty string or null
        const treasuryAccountId = values.treasuryAccountId?.trim() || null
        if (!treasuryAccountId || treasuryAccountId === '') {
          message.error('يرجى اختيار حساب الخزينة/البنك للصرف')
          return
        }

        // Derive payment method from treasury account type
        const selectedAccount = treasuryAccounts.find(acc => acc.id === treasuryAccountId)
        if (!selectedAccount) {
          message.error('حساب الخزينة المحدد غير موجود')
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

        // Get recipient name based on type
        let recipientName = null
        if (values.recipientType === 'internal' && values.recipientWorkerId) {
          const selectedWorker = workers.find(w => w.id === values.recipientWorkerId)
          recipientName = selectedWorker?.name || null
        } else if (values.recipientType === 'external' && values.recipientName) {
          recipientName = values.recipientName
        }

        // Prepare payment data for administrative expense
        // Note: The 'category' field here maps to 'expense_category' in the database via paymentsService
        // The 'recipientName' field maps to 'recipient_name' in the database
        const paymentData = {
          isGeneralExpense: true,
          projectId: null,
          workScope: null,
          category: values.category, // Maps to expense_category in DB via paymentsService
          amount: amountValue,
          dueDate: expenseDate,
          paidDate: expenseDate, // Same as dueDate since status is auto-set to 'paid'
          status: 'paid', // Auto-set to 'paid' for administrative expenses
          paymentMethod: derivedPaymentMethod === 'cash' ? 'Cash' : derivedPaymentMethod,
          referenceNumber: referenceNumber,
          notes: values.notes || null,
          recipientName: recipientName, // Maps to recipient_name in DB via paymentsService
          paymentFrequency: values.paymentFrequency || 'one-time',
          transactionType: 'regular',
          managerName: null,
          linkedAdvanceId: null
        }

        console.log('Payment Data for Administrative Expense:', paymentData)

        let result
        if (editingExpense) {
          console.log('Updating payment with ID:', editingExpense.id)
          result = await paymentsService.updatePayment(editingExpense.id, paymentData)
        } else {
          console.log('Creating new payment')
          result = await paymentsService.createPayment(paymentData)
        }

        console.log('Service result:', result)

        if (result.success) {
          message.success('تم حفظ المصروف بنجاح')
          
          // Update treasury if account selected - ensure it's not empty string or null
          if (treasuryAccountId && treasuryAccountId !== '' && result.payment?.id) {
            try {
              // Console log to trace account_id value
              console.log('GeneralExpenses: Creating treasury transaction for general expense', {
                paymentId: result.payment.id,
                accountId: treasuryAccountId,
                accountIdType: typeof treasuryAccountId,
                accountIdLength: treasuryAccountId?.length
              })
              
              const treasuryResult = await treasuryService.createTransaction({
                accountId: treasuryAccountId,
                transactionType: 'outflow',
                amount: amountValue,
                referenceType: 'expense',
                referenceId: result.payment.id,
                description: `مصروف إداري: ${values.category || ''} - ${values.notes || ''}`
              })
              
              if (treasuryResult.success) {
                console.log('GeneralExpenses: Treasury transaction created successfully for general expense', {
                  transactionId: treasuryResult.transaction?.id,
                  accountId: treasuryAccountId,
                  newBalance: treasuryResult.newBalance
                })
              } else {
                console.error('GeneralExpenses: Failed to update treasury for general expense:', treasuryResult.error)
                // Don't show error to user - expense is already saved
              }
            } catch (error) {
              console.error('GeneralExpenses: Error updating treasury for general expense:', error)
              // Don't show error to user - expense is already saved
            }
          }
          
          setIsModalVisible(false)
          form.resetFields()
          setSelectedProducts([])
          setEditingExpense(null)
          loadExpenses()
          loadTreasuryAccounts() // Refresh treasury accounts to show updated balances
        } else {
          const errorMsg = result.error || result.errorCode || 'فشل في حفظ المصروف'
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
      const errorMessage = error?.message || error?.details || 'فشل في حفظ المصروف'
      message.error(`خطأ في الحفظ: ${errorMessage}`)
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
      message.error('يرجى السماح بالنوافذ المنبثقة للطباعة')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>سند صرف - ${expense.paymentNumber || expense.id}</title>
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
          <h1>سند صرف</h1>
          <p>Payment Voucher</p>
        </div>
        <div class="details">
          <div class="detail-row">
            <span class="label">رقم السند:</span>
            <span>${expense.paymentNumber || expense.id}</span>
          </div>
          <div class="detail-row">
            <span class="label">التاريخ:</span>
            <span>${expense.dueDate ? dayjs(expense.dueDate).format('YYYY-MM-DD') : '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">المبلغ:</span>
            <span>${parseFloat(expense.amount || 0).toLocaleString()} ريال</span>
          </div>
          <div class="detail-row">
            <span class="label">المستلم:</span>
            <span>${expense.recipientName || '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">الفئة:</span>
            <span>${expense.expenseCategory || '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">الوصف:</span>
            <span>${expense.notes || '-'}</span>
          </div>
          <div class="detail-row">
            <span class="label">طريقة الدفع:</span>
            <span>${expense.paymentMethod || '-'}</span>
          </div>
        </div>
        <div class="footer">
          <p>تم الطباعة في: ${dayjs().format('YYYY-MM-DD HH:mm')}</p>
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
      message.error('يرجى السماح بالنوافذ المنبثقة للطباعة')
      return
    }

    const tableRows = filteredExpenses.map(expense => `
      <tr>
        <td>${expense.paymentNumber || expense.id}</td>
        <td>${expense.dueDate ? dayjs(expense.dueDate).format('YYYY-MM-DD') : '-'}</td>
        <td>${expense.recipientName || '-'}</td>
        <td>${expense.expenseCategory || '-'}</td>
        <td>${parseFloat(expense.amount || 0).toLocaleString()} ريال</td>
        <td>${expense.notes || '-'}</td>
      </tr>
    `).join('')

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير المصاريف العامة</title>
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
          <h1>تقرير المصاريف العامة</h1>
          <p>General Expenses Report</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>رقم المصروف</th>
              <th>التاريخ</th>
              <th>المستلم</th>
              <th>الفئة</th>
              <th>المبلغ</th>
              <th>الوصف</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <p>إجمالي المصاريف: ${totalExpenses.toLocaleString()} ريال</p>
          <p>تم الطباعة في: ${dayjs().format('YYYY-MM-DD HH:mm')}</p>
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
    const headers = ['رقم المصروف', 'التاريخ', 'المستلم', 'الفئة', 'المبلغ', 'الوصف', 'الحالة']
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
    link.setAttribute('download', `المصاريف_العامة_${dayjs().format('YYYY-MM-DD')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    message.success('تم تصدير البيانات بنجاح')
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

  const columns = [
    {
      title: 'رقم المصروف',
      dataIndex: 'paymentNumber',
      key: 'paymentNumber',
      width: 150
    },
    {
      title: 'المصدر/الهدف',
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
      title: 'المدير',
      dataIndex: 'managerName',
      key: 'managerName',
      width: 150,
      render: (manager: string) => manager ? <Tag color="purple">{manager}</Tag> : '-'
    }] : []),
    {
      title: 'نوع المصروف',
      dataIndex: 'isGeneralExpense',
      key: 'isGeneralExpense',
      width: 120,
      render: (isGeneral: boolean, record: any) => {
        if (record.transactionType === 'advance') {
          return <Tag color="orange">عهدة</Tag>
        }
        if (record.transactionType === 'settlement') {
          return <Tag color="cyan">تسوية</Tag>
        }
        return (
          <Tag color={isGeneral ? 'orange' : 'cyan'}>
            {isGeneral ? 'مصروف إداري' : 'مصروف مشروع'}
          </Tag>
        )
      }
    },
    {
      title: 'الفئة',
      dataIndex: 'expenseCategory',
      key: 'expenseCategory',
      width: 150,
      render: (category: string) => category ? <Tag>{category}</Tag> : '-'
    },
    {
      title: 'المستلم',
      dataIndex: 'recipientName',
      key: 'recipientName',
      width: 150,
      render: (name: string) => name ? <Tag color="blue">{name}</Tag> : '-'
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `${parseFloat(amount || 0).toLocaleString()} ريال`,
      sorter: (a: any, b: any) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0)
    },
    {
      title: 'التاريخ',
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
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: any) => {
        // Manager advances use: pending, approved, rejected, settled, partially_settled
        if (record.transactionType === 'advance' || record.transactionType === 'settlement') {
          const statusConfig: Record<string, { color: string; label: string }> = {
            pending: { color: 'warning', label: 'قيد المراجعة' },
            approved: { color: 'success', label: 'تمت الموافقة' },
            rejected: { color: 'error', label: 'مرفوض' },
            settled: { color: 'success', label: 'تم التسوية' },
            partially_settled: { color: 'processing', label: 'تم التسوية جزئياً' }
          }
          const config = statusConfig[status] || { color: 'default', label: status }
          return <Tag color={config.color}>{config.label}</Tag>
        }
        // Other expenses use: paid, pending, overdue, cancelled
        const statusConfig: Record<string, { color: string; label: string }> = {
          paid: { color: 'success', label: 'مدفوع' },
          pending: { color: 'warning', label: 'معلق' },
          overdue: { color: 'error', label: 'متأخر' },
          cancelled: { color: 'default', label: 'ملغي' }
        }
        const config = statusConfig[status] || { color: 'default', label: status }
        return <Tag color={config.color}>{config.label}</Tag>
      }
    },
    {
      title: 'طريقة الدفع',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const methods: Record<string, string> = {
          cash: 'نقدي',
          bank_transfer: 'تحويل بنكي',
          check: 'شيك',
          other: 'أخرى'
        }
        return method ? methods[method] || method : '-'
      }
    },
    {
      title: 'ملاحظات',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true
    },
    {
      title: 'الإجراءات',
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
              title="طباعة سند الصرف"
            >
              طباعة
            </Button>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditExpense(record)}
              size="small"
              disabled={isApproved}
              title={isApproved ? 'لا يمكن تعديل العهدة المعتمدة' : undefined}
            >
              تعديل
            </Button>
            <Popconfirm
              title="هل أنت متأكد من حذف هذا المصروف؟"
              onConfirm={() => handleDeleteExpense(record.id)}
              okText="نعم"
              cancelText="لا"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                size="small"
                disabled={isApproved}
                title={isApproved ? 'لا يمكن حذف العهدة المعتمدة' : undefined}
              >
                حذف
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  // Petty Cash Columns
  const pettyCashColumns = [
    ...columns.slice(0, 3), // Payment number, source, manager
    {
      title: 'نوع العملية',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 120,
      render: (type: string, record: any) => {
        if (type === 'advance') {
          return <Tag color="orange">إصدار عهدة</Tag>
        }
        if (type === 'settlement') {
          return <Tag color="cyan">تسوية</Tag>
        }
        return <Tag>عادي</Tag>
      }
    },
    {
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `${parseFloat(amount || 0).toLocaleString()} ريال`,
      sorter: (a: any, b: any) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0)
    },
    {
      title: 'المبلغ المتبقي',
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
              {remainingAmount.toLocaleString()} ريال
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
      title: 'التاريخ',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string, record: any) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
          pending: { color: 'warning', label: 'قيد المراجعة' },
          approved: { color: 'success', label: 'تمت الموافقة' },
          rejected: { color: 'error', label: 'مرفوض' },
          settled: { color: 'success', label: 'تم التسوية' },
          partially_settled: { color: 'processing', label: 'تم التسوية جزئياً' }
        }
        const config = statusConfig[status] || { color: 'default', label: status }
        return <Tag color={config.color}>{config.label}</Tag>
      }
    },
    {
      title: 'طريقة الدفع',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const methods: Record<string, string> = {
          cash: 'نقدي',
          bank_transfer: 'تحويل بنكي',
          check: 'شيك',
          other: 'أخرى'
        }
        return method ? methods[method] || method : '-'
      }
    },
    {
      title: 'اسم المشروع',
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
      title: 'العهدة المرتبطة',
      dataIndex: 'linkedAdvanceId',
      key: 'linkedAdvanceId',
      width: 150,
      render: (linkedId: string, record: any) => {
        if (record.transactionType === 'settlement' && linkedId) {
          const advance = pettyCashAdvances.find(a => a.id === linkedId)
          return advance ? (
            <Tag color="blue">
              {advance.referenceNumber || advance.paymentNumber} - {advance.amount} ريال
            </Tag>
          ) : (
            <Tag>{linkedId.substring(0, 8)}...</Tag>
          )
        }
        return '-'
      }
    },
    {
      title: 'منقول من',
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
                منقول من: {sourceAdvance.referenceNumber || sourceAdvance.paymentNumber}
              </Tag>
            )
          }
          // If source advance not found in current list, show truncated ID
          return (
            <Tag color="orange">
              منقول من: {sourceId.substring(0, 8)}...
            </Tag>
          )
        }
        return '-'
      }
    },
    {
      title: 'ملاحظات',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true
    },
    columns[columns.length - 1] // Actions column
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            <BankOutlined style={{ marginLeft: 8 }} />
            المصاريف العامة والإدارية
          </Title>
          <Space>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handlePrintAll}
              size="large"
            >
              طباعة الكل PDF
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              size="large"
            >
              تصدير Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddExpense}
              size="large"
            >
              إضافة مصروف جديد
            </Button>
          </Space>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="إجمالي المصاريف"
                value={totalExpenses}
                precision={0}
                suffix="ريال"
                prefix={<BankOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="المصاريف المدفوعة"
                value={paidExpenses}
                precision={0}
                suffix="ريال"
                styles={{ value: { color: '#3f8600' } }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="المصاريف المعلقة"
                value={pendingExpenses}
                precision={0}
                suffix="ريال"
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
              إجمالي العُهد المعلقة (Outstanding Advances)
            </Title>
            <Row gutter={16}>
              {outstandingAdvances.map((balance, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card size="small">
                    <Statistic
                      title={`${balance.managerName || 'غير محدد'}`}
                      value={balance.outstandingBalance}
                      precision={0}
                      suffix="ريال"
                      styles={{ value: { color: balance.outstandingBalance > 0 ? '#cf1322' : '#3f8600' } }}
                      prefix={<UserOutlined />}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                      {balance.advanceCount} عهدة | {balance.totalSettled.toLocaleString()} ريال مسدد
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
                  المصاريف العامة
                </span>
              ),
              children: (
                <>
                  {/* Search */}
                  <Input
                    placeholder="ابحث عن مصروف (رقم، مصدر، فئة، ملاحظات)..."
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
                      showTotal: (total) => `إجمالي ${total} مصروف`
                    }}
                    locale={{
                      emptyText: loading ? 'جاري التحميل...' : 'لا توجد مصاريف'
                    }}
                  />
                </>
              )
            },
            {
              key: 'petty-cash',
              label: (
                <span>
                  <WalletOutlined />
                  عُهد مديري المشاريع
                </span>
              ),
              children: (
                <>
                  {/* Search */}
                  <Input
                    placeholder="ابحث عن عهدة أو تسوية..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ marginBottom: 16, maxWidth: 400 }}
                    allowClear
                  />

                  {/* Table */}
                  <Table
                    columns={pettyCashColumns}
                    dataSource={filteredExpenses.map((e, idx) => ({ ...e, key: e.id || idx }))}
                    loading={loading}
                    scroll={{ x: 1700 }}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `إجمالي ${total} عملية`
                    }}
                    locale={{
                      emptyText: loading ? 'جاري التحميل...' : 'لا توجد عُهد أو تسويات'
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
        title={editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
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
            label="نوع المصروف / Type of Expense"
            rules={[{ required: true, message: 'يرجى اختيار نوع المصروف' }]}
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
                  Administrative / إداري
                </Space>
              </Radio.Button>
              <Radio.Button value="project" style={{ flex: 1, textAlign: 'center' }}>
                <Space>
                  <LinkOutlined />
                  Project Related / مشروع
                </Space>
              </Radio.Button>
              <Radio.Button value="manager_advance" style={{ flex: 1, textAlign: 'center' }}>
                <Space>
                  <WalletOutlined />
                  Manager Advance / عهدة مدير
                </Space>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Manager Advance Form: عهدة مدير المشروع */}
          {expenseType === 'manager_advance' && (
            <>
              <Form.Item
                name="transactionType"
                label="نوع العملية"
                rules={[{ required: true, message: 'يرجى اختيار نوع العملية' }]}
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
                  <Radio.Button value="advance">إصدار عهدة</Radio.Button>
                  <Radio.Button value="settlement">تسوية</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {/* Manager Name - Hidden for settlement, shown for advance */}
              {transactionType !== 'settlement' && (
                <Form.Item
                  name="managerName"
                  label="اسم مدير المشروع"
                  rules={[{ required: true, message: 'يرجى إدخال اسم مدير المشروع' }]}
                >
                  <AutoComplete
                    options={managers.map(m => ({ value: m, label: m }))}
                    placeholder="أدخل اسم مدير المشروع"
                    style={{ width: '100%' }}
                    size="large"
                    onSearch={(value) => {
                      if (!managers.includes(value) && value.trim()) {
                        setManagers([...new Set([...managers, value.trim()])])
                      }
                    }}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              )}

              {/* Settlement: Open Advance Dropdown */}
              {transactionType === 'settlement' && (
                <>
                  <Form.Item
                    name="linkedAdvanceId"
                    label="العهدة المفتوحة"
                    rules={[{ required: true, message: 'يرجى اختيار العهدة المفتوحة' }]}
                  >
                    <Select
                      placeholder="اختر العهدة المفتوحة (معتمدة فقط)"
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
                            {advance.referenceNumber || advance.paymentNumber} - {advance.managerName} - المبلغ الأصلي: {originalAmount.toLocaleString()} ريال - المتبقي: {remainingAmount.toLocaleString()} ريال ({dayjs(advance.dueDate || advance.createdAt).format('YYYY-MM-DD')})
                          </Option>
                        )
                      })}
                    </Select>
                  </Form.Item>

                  {/* Display linked advance info */}
                  {selectedLinkedAdvance && (
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f9ff', border: '1px solid #91d5ff' }}>
                      <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#1890ff' }}>
                        تفاصيل العهدة المرتبطة:
                      </div>
                      <div>المبلغ الأصلي: <strong>{parseFloat(selectedLinkedAdvance.amount || 0).toLocaleString()} ريال</strong></div>
                      <div>المبلغ المتبقي: <strong style={{ color: selectedLinkedAdvance.remainingAmount > 0 ? '#cf1322' : '#3f8600' }}>
                        {parseFloat(selectedLinkedAdvance.remainingAmount !== null && selectedLinkedAdvance.remainingAmount !== undefined ? selectedLinkedAdvance.remainingAmount : selectedLinkedAdvance.amount || 0).toLocaleString()} ريال
                      </strong></div>
                      <div>المدير: <strong>{selectedLinkedAdvance.managerName}</strong></div>
                      {selectedLinkedAdvance.projectId && (
                        <div>المشروع: <strong>{projects.find(p => p.id === selectedLinkedAdvance.projectId)?.name || 'جاري التحميل...'}</strong></div>
                      )}
                    </Card>
                  )}

                  {/* Settlement Type: Expense or Return */}
                  <Form.Item
                    name="settlementType"
                    label="نوع التسوية"
                    rules={[{ required: true, message: 'يرجى اختيار نوع التسوية' }]}
                    initialValue="expense"
                  >
                    <Radio.Group
                      value={settlementType}
                      onChange={(e) => setSettlementType(e.target.value)}
                      buttonStyle="solid"
                      size="large"
                    >
                      <Radio.Button value="expense">مصروف</Radio.Button>
                      <Radio.Button value="return">مرتجع نقدي</Radio.Button>
                    </Radio.Group>
                  </Form.Item>

                  {/* Project ID - Read-Only for settlements, with Transfer button */}
                  {isEngineering && selectedLinkedAdvance?.projectId && (
                    <Form.Item
                      name="projectId"
                      label="المشروع"
                    >
                      <Input.Group compact>
                        <Input
                          value={projects.find(p => p.id === selectedLinkedAdvance.projectId)?.name || 'جاري التحميل...'}
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
                          ترحيل العهدة
                        </Button>
                      </Input.Group>
                    </Form.Item>
                  )}

                  {/* Work Scope - Show for settlements with project that has work scopes */}
                  {isEngineering && selectedLinkedAdvance?.projectId && availableWorkScopes.length > 0 && settlementType === 'expense' && (
                    <Form.Item
                      name="workScope"
                      label="نطاق العمل (اختياري)"
                      tooltip="نطاق العمل للمشروع"
                    >
                      <Select
                        placeholder="اختر نطاق العمل (اختياري)"
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
                        label="المورد/المستلم"
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
                          placeholder="ابحث عن مورد أو عميل بالاسم أو الهاتف..."
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
                                label="اسم المورد"
                                required
                                tooltip="اسم المورد مطلوب"
                              >
                                <Input
                                  placeholder="اسم المورد"
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
                              <Form.Item label="رقم الهاتف (اختياري)">
                                <Input
                                  placeholder="رقم الهاتف"
                                  value={settlementPoNewVendorPhone}
                                  onChange={(e) => setSettlementPoNewVendorPhone(e.target.value)}
                                  size="large"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="البريد الإلكتروني (اختياري)">
                                <Input
                                  placeholder="البريد الإلكتروني"
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
                      <Form.Item label="بنود أمر الشراء" required>
                        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                          <Col span={12}>
                            <Form.Item name="settlementPoItemDescription" noStyle>
                              <Input placeholder="وصف البند/المادة" size="large" />
                            </Form.Item>
                          </Col>
                          <Col span={6}>
                            <Form.Item name="settlementPoQuantity" noStyle>
                              <InputNumber
                                placeholder="الكمية"
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
                                placeholder="سعر الوحدة"
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
                  label="المشروع (اختياري)"
                  tooltip="يمكن تركها فارغة للمهام العامة للشركة"
                >
                  <Select
                    placeholder="اختر المشروع (اختياري)"
                    showSearch
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
                label={transactionType === 'settlement' && settlementType === 'expense' ? "مبلغ التسوية (يُحسب تلقائياً من البنود)" : "المبلغ (ريال)"}
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
                    placeholder="0.00"
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
                    label="حساب الخزينة"
                    rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة للإرجاع' }]}
                    tooltip="اختر الحساب الذي سيتم إرجاع المبلغ إليه"
                  >
                    <Select 
                      size="large" 
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

                  {/* Reference Number for Settlements */}
                  <Form.Item
                    name="referenceNumber"
                    label="رقم المرجع (اختياري)"
                  >
                    <Input placeholder="رقم المرجع" size="large" />
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
                  placeholder="اختر الفئة"
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
                              placeholder="اسم الفئة الجديدة"
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

              {/* Amount */}
              <Form.Item
                name="amount"
                label="المبلغ (ريال) / Amount"
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
                name="notes"
                label="الوصف / Description"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="وصف المصروف (اختياري)"
                  size="large"
                />
              </Form.Item>

              {/* Recipient Type Toggle */}
              <Form.Item
                name="recipientType"
                label="نوع المستلم / Recipient Type"
                rules={[{ required: true, message: 'يرجى اختيار نوع المستلم' }]}
                initialValue="external"
              >
                <Radio.Group
                  value={recipientType}
                  onChange={(e) => {
                    setRecipientType(e.target.value)
                    setSelectedWorkerId(null)
                    form.setFieldsValue({ recipientName: undefined, recipientWorkerId: undefined })
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
                name={recipientType === 'internal' ? 'recipientWorkerId' : 'recipientName'}
                label="اسم المستلم / Recipient Name"
                rules={[{ required: true, message: 'يرجى اختيار/إدخال اسم المستلم' }]}
                tooltip="اسم المستلم مهم لطباعة سند الصرف (Payment Voucher) لاحقاً"
              >
                {recipientType === 'internal' ? (
                  <Select
                    placeholder="اختر الموظف"
                    showSearch
                    size="large"
                    value={selectedWorkerId}
                    onChange={(value) => {
                      setSelectedWorkerId(value)
                      const worker = workers.find(w => w.id === value)
                      form.setFieldsValue({ recipientName: worker?.name || '' })
                    }}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {workers.map((worker) => (
                      <Option key={worker.id} value={worker.id}>
                        {worker.name} - {worker.trade}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    placeholder="أدخل اسم المستلم الخارجي"
                    size="large"
                  />
                )}
              </Form.Item>

              {/* Date - Single field for administrative expenses, defaults to today */}
              <Form.Item
                name="date"
                label="التاريخ / Date"
                rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  size="large"
                  placeholder="اختر التاريخ (افتراضي: اليوم)"
                />
              </Form.Item>

              {/* Reference Number - Auto-generated if empty (optional field) */}
              <Form.Item
                name="referenceNumber"
                label="رقم المرجع (اختياري) / Reference Number (optional)"
                tooltip="إذا تركته فارغاً، سيتم توليد رقم مرجع تلقائياً (EXP-001, EXP-002, إلخ)"
              >
                <Input placeholder="EXP-001 (سيتم توليده تلقائياً إذا كان فارغاً)" size="large" />
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
                        label={<span style={{ fontWeight: 'bold' }}>المشروع</span>}
                        rules={[{ required: true, message: 'يرجى اختيار المشروع' }]}
                      >
                        <Select
                          placeholder="اختر المشروع"
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
                          label={<span style={{ fontWeight: 'bold' }}>نطاق العمل</span>}
                          rules={[{ required: true, message: 'يرجى اختيار نطاق العمل' }]}
                        >
                          <Select
                            placeholder="اختر نطاق العمل"
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
                label="المورد/العميل"
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
                        label="اسم المورد"
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

              <Form.Item label="البنود" required>
                <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Form.Item name="itemDescription" noStyle>
                      <Input placeholder="وصف البند/المادة (مثال: 100 كيس أسمنت)" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item 
                      name="quantity" 
                      label="الكمية"
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
                      label="سعر الوحدة"
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
                label="التاريخ"
                rules={[{ required: true, message: 'يرجى اختيار التاريخ' }]}
                initialValue={dayjs()}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  size="large"
                  placeholder="اختر التاريخ (افتراضي: اليوم)"
                />
              </Form.Item>

              {/* Status - Only show for advances, not settlements */}
              {transactionType !== 'settlement' && (
                <Form.Item
                  name="status"
                  label="الحالة"
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
                        label="حساب الخزينة"
                        rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة/البنك للصرف' }]}
                        tooltip="اختر الحساب الذي سيتم خصم مبلغ العهدة منه"
                      >
                        <Select 
                          size="large" 
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
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="referenceNumber"
                        label="رقم المرجع"
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
                      label="رقم المرجع (اختياري)"
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
                    label="حالة أمر الشراء"
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
                    label="حساب الخزينة"
                    rules={[{ required: true, message: 'يرجى اختيار حساب الخزينة/البنك للصرف' }]}
                    tooltip="اختر الحساب الذي سيتم خصم قيمة أمر الشراء منه"
                  >
                    <Select 
                      size="large"
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
                placeholder="أي ملاحظات إضافية..."
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
                placeholder="اختر المشروع الجديد"
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
    </div>
  )
}

export default GeneralExpenses
