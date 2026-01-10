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
  AutoComplete
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
  LinkOutlined
} from '@ant-design/icons'
import paymentsService from '../services/paymentsService'
import projectsService from '../services/projectsService'
import categoryService from '../services/categoryService'
import customersService from '../services/customersService'
import ordersService from '../services/ordersService'
import { useTenant } from '../contexts/TenantContext'
import dayjs from 'dayjs'

const { Option } = Select
const { Title } = Typography
const { TabPane } = Tabs

type ExpenseType = 'administrative' | 'project'
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
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const isEngineering = industryType === 'engineering'

  useEffect(() => {
    loadExpenses()
    loadCategories()
    if (isEngineering) {
      loadProjects()
    }
    loadOutstandingAdvances()
  }, [industryType])

  useEffect(() => {
    if (activeTab === 'petty-cash') {
      loadPettyCashAdvances()
      loadOutstandingAdvances()
    }
  }, [activeTab])

  const loadCategories = async () => {
    try {
      const [adminCats, projectCats] = await Promise.all([
        categoryService.getAdministrativeCategories(),
        categoryService.getProjectCategories()
      ])
      setAdminCategories(adminCats.map(cat => ({ value: cat.name, label: cat.nameAr || cat.name })))
      setProjectCategories(projectCats.map(cat => ({ value: cat.name, label: cat.nameAr || cat.name })))
    } catch (error) {
      console.error('Error loading categories:', error)
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
      const managerNames = balances.map(b => b.managerName).filter(Boolean)
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
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense)
    const isAdmin = expense.isGeneralExpense
    setExpenseType(isAdmin ? 'administrative' : 'project')
    setTransactionType(expense.transactionType || 'regular')
    setSelectedCustomer(null)
    setCustomerSearchValue('')
    setIsNewSupplier(false)
    setSelectedProject(null)
    form.setFieldsValue({
      expenseType: isAdmin ? 'administrative' : 'project',
      projectId: expense.projectId || undefined,
      category: expense.expenseCategory || undefined,
      amount: expense.amount,
      dueDate: expense.dueDate ? dayjs(expense.dueDate) : undefined,
      paidDate: expense.paidDate ? dayjs(expense.paidDate) : undefined,
      status: expense.status,
      paymentMethod: expense.paymentMethod || undefined,
      referenceNumber: expense.referenceNumber || undefined,
      notes: expense.notes || undefined,
      paymentFrequency: expense.paymentFrequency || 'one-time',
      transactionType: expense.transactionType || 'regular',
      managerName: expense.managerName || undefined,
      linkedAdvanceId: expense.linkedAdvanceId || undefined
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
      const searchResults = await customersService.searchCustomers(searchText)
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
    const quantity = form.getFieldValue('quantity') || 1
    const unitPrice = form.getFieldValue('unitPrice') || 0

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
    form.setFieldsValue({ itemDescription: '', quantity: 1, unitPrice: 0 })
    message.success('تم إضافة البند')
  }

  const handleRemoveItem = (index: number) => {
    const updated = [...selectedProducts]
    updated.splice(index, 1)
    setSelectedProducts(updated)
  }

  const handleSubmit = async (values: any) => {
    try {
      const isAdmin = expenseType === 'administrative'
      const isProjectExpense = expenseType === 'project'
      
      // For project expenses, use the same structure as OrdersPage
      if (isProjectExpense && selectedProducts.length > 0) {
        // Create order-like structure for project expenses
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

        // Create order for project expense
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
          status: 'pending',
          paymentMethod: values.paymentMethod || 'cash',
          shippingAddress: '',
          shippingMethod: 'standard',
          notes: values.notes || '',
          createdBy: 'user'
        }

        const orderResult = await ordersService.createOrder(orderData)
        
        if (!orderResult.success) {
          message.error(orderResult.error || 'فشل في إنشاء أمر الشراء')
          return
        }

        // Also create payment record for the expense
        const paymentData = {
          isGeneralExpense: false,
          projectId: isEngineering ? (values.projectId || null) : null,
          workScope: isEngineering ? (values.workScope || null) : null,
          category: values.category,
          amount: selectedProducts.reduce((sum, item) => sum + (item.total || 0), 0),
          dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
          paidDate: values.paidDate ? values.paidDate.format('YYYY-MM-DD') : null,
          status: values.status || 'pending',
          paymentMethod: values.paymentMethod || null,
          referenceNumber: values.referenceNumber || null,
          notes: values.notes || null,
          paymentType: 'expense',
          paymentFrequency: values.paymentFrequency || 'one-time',
          transactionType: 'regular'
        }

        const paymentResult = await paymentsService.createPayment(paymentData)
        
        if (paymentResult.success) {
          message.success('تم إضافة مصروف المشروع وأمر الشراء بنجاح')
          setIsModalVisible(false)
          form.resetFields()
          setSelectedProducts([])
          loadExpenses()
        } else {
          message.error(paymentResult.error || 'فشل في إنشاء سجل الدفع')
        }

        return
      }

      // Regular expense (administrative or simple project expense)
      const paymentData = {
        isGeneralExpense: isAdmin,
        projectId: isAdmin ? null : (values.projectId || null),
        workScope: isAdmin ? null : (values.workScope || null),
        category: values.category,
        amount: parseFloat(values.amount),
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        paidDate: values.paidDate ? values.paidDate.format('YYYY-MM-DD') : null,
        status: values.status || 'pending',
        paymentMethod: values.paymentMethod || null,
        referenceNumber: values.referenceNumber || null,
        notes: values.notes || null,
        paymentType: 'expense',
        paymentFrequency: values.paymentFrequency || 'one-time',
        transactionType: transactionType,
        managerName: transactionType === 'advance' || transactionType === 'settlement' ? (values.managerName || null) : null,
        linkedAdvanceId: transactionType === 'settlement' ? (values.linkedAdvanceId || null) : null
      }

      let result
      if (editingExpense) {
        result = await paymentsService.updatePayment(editingExpense.id, paymentData)
      } else {
        result = await paymentsService.createPayment(paymentData)
      }

      if (result.success) {
        message.success(editingExpense ? 'تم تحديث المصروف بنجاح' : 'تم إضافة المصروف بنجاح')
        setIsModalVisible(false)
        form.resetFields()
        setSelectedProducts([])
        loadExpenses()
        if (activeTab === 'petty-cash') {
          loadPettyCashAdvances()
          loadOutstandingAdvances()
        }
      } else {
        message.error(result.error || (editingExpense ? 'فشل في تحديث المصروف' : 'فشل في إضافة المصروف'))
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      message.error('فشل في حفظ المصروف')
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
  }

  // Calculate statistics
  const totalExpenses = expenses.filter(e => e.transactionType !== 'advance' && e.transactionType !== 'settlement').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const paidExpenses = expenses.filter(e => e.status === 'paid' && e.transactionType !== 'advance' && e.transactionType !== 'settlement').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const pendingExpenses = expenses.filter(e => e.status === 'pending' && e.transactionType !== 'advance' && e.transactionType !== 'settlement').reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

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
      title: 'المبلغ',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `${parseFloat(amount || 0).toLocaleString()} ريال`,
      sorter: (a: any, b: any) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0)
    },
    {
      title: 'دورية الصرف',
      dataIndex: 'paymentFrequency',
      key: 'paymentFrequency',
      width: 120,
      render: (frequency: string) => {
        const freqMap: Record<string, string> = {
          'one-time': 'لمرة واحدة',
          'monthly': 'شهري',
          'yearly': 'سنوي'
        }
        return frequency ? <Tag>{freqMap[frequency] || frequency}</Tag> : '-'
      }
    },
    {
      title: 'تاريخ الاستحقاق',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: 'تاريخ الدفع',
      dataIndex: 'paidDate',
      key: 'paidDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
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
          cash: 'نقد',
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
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditExpense(record)}
            size="small"
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
            >
              حذف
            </Button>
          </Popconfirm>
        </Space>
      )
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
    ...columns.slice(5), // Amount, frequency, dates, status, etc.
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
              {advance.paymentNumber} - {advance.amount} ريال
            </Tag>
          ) : (
            <Tag>{linkedId.substring(0, 8)}...</Tag>
          )
        }
        return '-'
      }
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            <BankOutlined style={{ marginLeft: 8 }} />
            المصاريف العامة والإدارية
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddExpense}
            size="large"
          >
            إضافة مصروف جديد
          </Button>
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
                valueStyle={{ color: '#3f8600' }}
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
                valueStyle={{ color: '#cf1322' }}
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
                      valueStyle={{ color: balance.outstandingBalance > 0 ? '#cf1322' : '#3f8600' }}
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

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><BankOutlined />المصاريف العامة</span>} key="general">
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
            />
          </TabPane>

          <TabPane tab={<span><WalletOutlined />عُهد مديري المشاريع</span>} key="petty-cash">
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
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={900}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            expenseType: 'administrative',
            status: 'pending',
            paymentFrequency: 'one-time',
            transactionType: 'regular',
            quantity: 1,
            unitPrice: 0
          }}
        >
          <Form.Item
            name="expenseType"
            label="نوع المصروف"
            rules={[{ required: true, message: 'يرجى اختيار نوع المصروف' }]}
          >
            <Radio.Group
              value={expenseType}
              onChange={(e) => {
                setExpenseType(e.target.value)
                form.setFieldsValue({ projectId: undefined, category: undefined, workScope: undefined })
                setSelectedProducts([])
              }}
              buttonStyle="solid"
              size="large"
            >
              <Radio.Button value="administrative">
                <Space>
                  <BankOutlined />
                  مصروف إداري
                </Space>
              </Radio.Button>
              <Radio.Button value="project">
                <Space>
                  <BankOutlined />
                  مصروف مشروع
                </Space>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          {/* Transaction Type for Petty Cash */}
          {activeTab === 'petty-cash' && (
            <Form.Item
              name="transactionType"
              label="نوع العملية"
              rules={[{ required: true, message: 'يرجى اختيار نوع العملية' }]}
            >
              <Radio.Group
                value={transactionType}
                onChange={(e) => {
                  setTransactionType(e.target.value)
                  if (e.target.value !== 'settlement') {
                    form.setFieldsValue({ linkedAdvanceId: undefined })
                  }
                  if (e.target.value === 'regular') {
                    form.setFieldsValue({ managerName: undefined })
                  }
                }}
                buttonStyle="solid"
                size="large"
              >
                <Radio.Button value="advance">إصدار عهدة</Radio.Button>
                <Radio.Button value="settlement">تسوية</Radio.Button>
                <Radio.Button value="regular">عادي</Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {/* Manager Name for Advance/Settlement */}
          {(transactionType === 'advance' || transactionType === 'settlement') && (
            <Form.Item
              name="managerName"
              label="اسم المدير"
              rules={[{ required: true, message: 'يرجى إدخال اسم المدير' }]}
            >
              <AutoComplete
                options={managers.map(m => ({ value: m, label: m }))}
                placeholder="أدخل اسم المدير"
                style={{ width: '100%' }}
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

          {/* Linked Advance for Settlement */}
          {transactionType === 'settlement' && (
            <Form.Item
              name="linkedAdvanceId"
              label="العهدة المرتبطة"
              rules={[{ required: true, message: 'يرجى اختيار العهدة المرتبطة' }]}
            >
              <Select
                placeholder="اختر العهدة المرتبطة"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                size="large"
              >
                {pettyCashAdvances
                  .filter(a => a.transactionType === 'advance' && a.managerName === form.getFieldValue('managerName'))
                  .map((advance) => (
                    <Option key={advance.id} value={advance.id}>
                      {advance.paymentNumber} - {advance.amount} ريال ({dayjs(advance.dueDate).format('YYYY-MM-DD')})
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          {expenseType === 'project' && (
            <>
              {isEngineering && (
                <>
                  <Form.Item
                    name="projectId"
                    label="المشروع"
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
                          {p.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  {selectedProject && availableWorkScopes.length > 0 && (
                    <Form.Item
                      name="workScope"
                      label="نطاق العمل"
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
                </>
              )}

              {/* Project Expense Form (like OrdersPage) */}
              <Divider>بنود المصروف</Divider>
              
              <Form.Item label="المورد/العميل" required>
                <AutoComplete
                  options={customerSearchOptions}
                  onSearch={handleCustomerSearch}
                  onSelect={handleCustomerSelect}
                  onChange={(value) => setCustomerSearchValue(value)}
                  value={customerSearchValue}
                  placeholder="ابحث عن مورد أو عميل بالاسم أو الهاتف..."
                  style={{ width: '100%' }}
                  filterOption={false}
                />
              </Form.Item>

              {isNewSupplier && (
                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item label="اسم المورد" required>
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

              <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Form.Item name="itemDescription" label="وصف البند/المادة">
                    <Input placeholder="وصف البند/المادة (مثال: 100 كيس أسمنت)" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="quantity" label="الكمية">
                    <InputNumber
                      placeholder="الكمية"
                      min={0.01}
                      step={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="unitPrice" label="سعر الوحدة">
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

              {selectedProducts.length > 0 && (
                <Card title="البنود المضافة" size="small" style={{ marginBottom: 16 }}>
                  <Table
                    dataSource={selectedProducts.map((item, index) => ({ ...item, key: index }))}
                    columns={[
                      { title: 'الوصف', dataIndex: 'product' },
                      { title: 'الكمية', dataIndex: 'quantity' },
                      { title: 'السعر', dataIndex: 'price', render: (p) => `${p.toLocaleString()} ريال` },
                      { title: 'الإجمالي', dataIndex: 'total', render: (t) => `${t.toLocaleString()} ريال` },
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
                      const total = selectedProducts.reduce((sum, item) => sum + (item.total || 0), 0)
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

          {/* Category Selection */}
          {expenseType !== 'project' || selectedProducts.length === 0 ? (
            <Form.Item
              name="category"
              label="الفئة"
              rules={[{ required: true, message: 'يرجى اختيار الفئة' }]}
            >
              <Select
                placeholder="اختر الفئة"
                size="large"
                dropdownRender={(menu) => (
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
                        <Space direction="vertical" style={{ width: '100%' }}>
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
                {(expenseType === 'administrative' ? adminCategories : projectCategories).map((cat) => (
                  <Option key={cat.value} value={cat.value}>
                    {cat.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
            <Form.Item
              name="category"
              label="الفئة"
              rules={[{ required: true, message: 'يرجى اختيار الفئة' }]}
            >
              <Select
                placeholder="اختر الفئة"
                size="large"
                options={projectCategories}
              />
            </Form.Item>
          )}

          {/* Amount (only for non-project expenses or if no items added) */}
          {(expenseType === 'administrative' || (expenseType === 'project' && selectedProducts.length === 0)) && (
            <Form.Item
              name="amount"
              label="المبلغ (ريال)"
              rules={[
                { required: true, message: 'يرجى إدخال المبلغ' },
                { type: 'number', min: 0.01, message: 'يجب أن يكون المبلغ أكبر من صفر' }
              ]}
            >
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                size="large"
              />
            </Form.Item>
          )}

          {/* Payment Frequency */}
          <Form.Item
            name="paymentFrequency"
            label="دورية الصرف"
            rules={[{ required: true, message: 'يرجى اختيار دورية الصرف' }]}
          >
            <Select size="large">
              <Option value="one-time">لمرة واحدة</Option>
              <Option value="monthly">شهري</Option>
              <Option value="yearly">سنوي</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="dueDate"
                label="تاريخ الاستحقاق"
                rules={[{ required: true, message: 'يرجى اختيار تاريخ الاستحقاق' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="paidDate"
                label="تاريخ الدفع (اختياري)"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="status"
                label="الحالة"
                rules={[{ required: true, message: 'يرجى اختيار الحالة' }]}
              >
                <Select size="large">
                  <Option value="pending">معلق</Option>
                  <Option value="paid">مدفوع</Option>
                  <Option value="overdue">متأخر</Option>
                  <Option value="cancelled">ملغي</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="paymentMethod"
                label="طريقة الدفع"
              >
                <Select placeholder="اختر طريقة الدفع" size="large">
                  <Option value="cash">نقد</Option>
                  <Option value="bank_transfer">تحويل بنكي</Option>
                  <Option value="check">شيك</Option>
                  <Option value="other">أخرى</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="referenceNumber"
                label="رقم المرجع (اختياري)"
              >
                <Input placeholder="رقم المرجع أو رقم الفاتورة" size="large" />
              </Form.Item>
            </Col>
          </Row>

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

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                {editingExpense ? 'تحديث' : 'حفظ'}
              </Button>
              <Button onClick={handleCancel} size="large">
                إلغاء
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default GeneralExpenses
